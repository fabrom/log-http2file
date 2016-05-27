"use strict"

/* ---------------------------------------------------------------------------
Log-HTTP2File - https://github.com/fabrom/log-http2file
Simple HTTP server to log POST request content to file
Author: Fabrice Romand <fabrice.romand@gmail.com>
README for more information
---------------------------------------------------------------------------- */

// Requirements ----
const http = require('http');
const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const tmpdir = require('os').tmpdir();
const path = require('path');


// Variables declaration ----
var prg_package = null;
var port = (process.env.npm_package_config_port) ? process.env.npm_package_config_port : 8142;
var nb_workers = (numCPUs/2)+1; 
var output_file = path.join(tmpdir, 'message.log');


// Retrieve request source address
function getRemoteAddress(req) {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'];
    }
    return req.connection.remoteAddress;
}

// Retrieve request user-agent
function getRemoteAgent(req) {
    if (req.headers['user-agent']) {
        return req.headers['user-agent'];
    }
    return null;
}

// Retrieve remote user
// FIXME: Seems to failed
function getRemoteUser(req) {
    if (req.headers['remote_user']) {
        return req.headers['remote_user'];
    }
    return null;
}

// Return Object in string is JSON, null otherwise
function isJSON(jsonString) {
    try {
      var json = JSON.parse(jsonString);
    } catch (exception) {
      json = null;
    }
    return json;
}

// Go through all workers
function eachWorker(callback) {
  for (var id in cluster.workers) {
    callback(cluster.workers[id]);
  }
}

// Fork cluster
function setWorkers() {
    for (var i = 1; i <= nb_workers; i++) {
        cluster.fork();
    }
    console.log(`Master process id: ${process.pid}`);
}

// Main -----------------------------------------------------------------------

function startServer(onReadyCallBack) {
    
    if (cluster.isMaster) {
        
        const program = require('commander');
        
        prg_package = JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'), 'utf8'));
        console.log(prg_package.name + " v." + prg_package.version + ' - ' + prg_package.description);
        console.log("Author: " + prg_package.author + " - Homepage: " + prg_package.homepage);
        console.log("Report bugs on " + prg_package.bugs);
        
        program
            .version(prg_package.version)
            .usage('[options] <outputfile>')
            .option('-w, --workers <n>', 'how many listening workers', parseInt)
            .option('-p, --port <n>', 'listening port', parseInt)
            .arguments('<outputfile>')
                .action(function (outputfile) {
                    output_file = outputfile;
                })
            .parse(process.argv);
            
        nb_workers = program.workers || nb_workers;
        port = program.port || port;
        
        cluster.on('exit', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} exit with code: ${code} (signal: ${signal})`);
        });
        
        cluster.on('listening', (worker, code, signal) => {
        console.log(`worker ${worker.process.pid} now listening on port ${port} and writing to ${output_file}...`);
        });
        
        process.on('SIGHUP', function() {
            eachWorker(function(worker) {
                worker.kill('SIGHUP');
            })
            var d = new Date();
            var d1 = d.toISOString();
            var d2 = d1.substr(0,19).replace(/-/g,'').replace(/:/g,'').replace('T','');
            var newdir = path.dirname(output_file);
            var newname = path.basename(output_file, path.extname(output_file)) + '_' + d2 + path.extname(output_file);
            fs.rename(output_file, path.join(newdir, newname), function() {
                console.log(`${path.basename(output_file)} renamed to ${newname}`);
                setWorkers();            
            });
        });
        
        process.on('SIGINT', function() {
            eachWorker(function(worker) {
                worker.kill('SIGINT');
            });
        });
        
        process.on('SIGTERM', function() {
            eachWorker(function(worker) {
                worker.kill('SIGTERM');
            });
        });
        
        process.on('SIGBREAK', function() {
            eachWorker(function(worker) {
                worker.kill('SIGBREAK');
            });
        });
            
        setWorkers();
        
        if (onReadyCallBack) onReadyCallBack();

    } else {

        fs.open(output_file, 'a', function(err, flogd) {

            if (err) {
                console.error("can't open output file");
                cluster.worker.kill();
            } else {
                const server = http.createServer((request, response) => {
                    if (request.method !== 'POST') {
                        response.statusCode = 405;
                        response.end();
                    } else {
                        var body = '';
                        request.on('data', function (data) {
                            body += data;
                            // 1e6 === 1 * Math.pow(10, 6) === 1 * 1000000 ~~~ 1MB
                            if (body.length > 1e6) {
                                // FLOOD ATTACK OR FAULTY CLIENT, NUKE REQUEST
                                request.connection.destroy();
                            }
                        });
                        request.on('end', function () {
                            var remote_address = getRemoteAddress(request);
                            var remote_user = getRemoteUser(request);
                            var body_object = isJSON(body);
                            var remote_object = { 
                                    address: remote_address,
                                    user: remote_user,
                                    agent: getRemoteAgent(request)
                            };
                            if (body_object instanceof Object) {
                                body_object.remote = remote_object;
                                body = JSON.stringify(body_object);
                            };
                            fs.write(flogd, body + '\n', function(err, written, string) {
                                if (err) {
                                    console.error("can't write to output file");
                                }
                                response.statusCode = 200;
                                response.end();
                            });
                            var continuation = (body.length > 128) ? "..." : "";
                            var message = body.substr(0, 128);
                            console.log(Date.now() +
                                " [" + remote_address +
                                "][" + cluster.worker.process.pid + 
                                "] " + message + continuation
                            );
                        });

                    }
                });

                server.on('clientError', (err, socket) => {
                    socket.statusCode = 400;
                    socket.end();
                });

                server.on('close', (err, socket) => {
                    fs.close(flogd);
                });
            
                server.listen(port);
            }
        });
    }
}

function stopServer() {
    process.kill(process.pid, 'SIGTERM');
}

function renewServer() {
    process.kill(process.pid, 'SIGHUP');
}

module.exports = exports
exports.start = startServer;
exports.stop = stopServer;
exports.renew = renewServer;

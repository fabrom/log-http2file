"use strict"

const http = require('http');
const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const tmpdir = require('os').tmpdir();
const path = require('path');

var prg_package = null;
var port = (process.env.npm_package_config_port) ? process.env.npm_package_config_port : 8142;
var nb_workers = (numCPUs/2)+1
var tmplogfile = path.join(tmpdir, 'message.log');
var output_file = (process.argv.length > 2) ? process.argv[process.argv.length - 1] : tmplogfile;


function getRemoteAddress(req) {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'];
    }
    return req.connection.remoteAddress;
}

function getRemoteAgent(req) {
    if (req.headers['user-agent']) {
        return req.headers['user-agent'];
    }
    return null;
}

function getRemoteUser(req) {
    if (req.headers['remote_user']) {
        return req.headers['remote_user'];
    }
    return null;
}

function isJSON(jsonString) {
    try {
      json = JSON.parse(jsonString);
    } catch (exception) {
      json = null;
    }
    return json;
}

if (cluster.isMaster) {

    prg_package = JSON.parse(fs.readFileSync(path.join(__dirname,'package.json'), 'utf8'));
    console.log(prg_package.name + " v." + prg_package.version + ' - ' + prg_package.description);
    console.log("Author: " + prg_package.author + " - Homepage: " + prg_package.homepage);
    console.log("Report bugs on " + prg_package.bugs);
    
    nb_workers = (process.argv.indexOf('-w')>-1) ? process.argv[process.argv.indexOf('-w') + 1] : nb_workers;
    for (var i = 1; i <= nb_workers; i++) {
        cluster.fork();
    }
    
    port = (process.argv.indexOf('-p')>-1) ? process.argv[process.argv.indexOf('-p') + 1] : port;
    console.log(`${nb_workers} workers listening on port ${port} and writing to ${output_file}...`);

    cluster.on('exit', (worker, code, signal) => {
      console.log(`worker ${worker.process.pid} exit with code: ${code} (signal: ${signal})`);
    });

} else {

    fs.open(output_file, 'a', function(err, flogd) {

        if (err) {
            console.log("can't open output file");
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
                        fs.write(flogd, body + '\n', function() {
                            response.statusCode = 200;
                            response.end();
                        });
                        var continuation = (body.length > 128) ? "..." : "";
                        var message = body.substr(1, 128);
                        console.log(Date.now() +
                            " [" + remote_address +
                            "][" + cluster.worker.process.pid + 
                            "][" + path.basename(output_file) +
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
                console.log('closing server...');
                fs.close(flogd);
            });

            server.listen(port);

        }
    });
}

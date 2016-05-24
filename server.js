
const http = require('http');
const fs = require('fs');
const cluster = require('cluster');
const numCPUs = require('os').cpus().length;
const path = require('path');

var prg_package = null;
var port = (process.env.npm_package_config_port) ? process.env.npm_package_config_port : 8142;
var nb_workers = (numCPUs/2)+1
var output_file = process.argv[process.argv.length - 1];


function getRemoteAddress(req) {
    if (req.headers['x-forwarded-for']) {
        return req.headers['x-forwarded-for'];
    }
    return req.connection.remoteAddress;
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
                    request.socket.end('HTTP/1.1 405 Bad Request\r\n\r\n');
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
                        console.log((new Date()).toJSON() +
                            " ["+ getRemoteAddress(request) +
                            "][" + cluster.worker.process.pid +
                            "][" + path.basename(output_file) +
                            "] " + body);
                        fs.write(flogd, body + '\n', function() {
                            request.socket.end('HTTP/1.1 200 Ok\r\n\r\n');
                        });
                    });

                }
            });

            server.on('clientError', (err, socket) => {
                socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
            });

            server.on('close', (err, socket) => {
                console.log('closing server...');
                fs.close(flogd);
            });

            server.listen(port);

        }
    });
}

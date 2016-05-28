# Log-HTTP2File

_Simple HTTP server to log POST request content to file_

Homepage: https://github.com/fabrom/log-http2file  
Report bugs on https://github.com/fabrom/log-http2file/issues  
  

## Requirements

- [Node.js](http:/nodejs.org)

## Installation

```sh
npm install log-http2file
```

To download a zip, go to the Log-HTTP2File on Github  


## Usage

```sh
  Usage: log-http2file [options] <outputfile>
  
  Simple HTTP server to log POST request content to file

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -w, --workers <n>  how many listening workers
    -p, --port <n>     listening port
```

### Starting server

```sh
./log-http2file [options] output_file_path
```
Look at [forever](https://github.com/foreverjs/forever) tool for running this server in production.

##### Options

- **-w** _workers count_          (default=(CPUs/2)+1)
- **-p** _listening port_         (default=8142)

### Log rotation

SIGHUP signal stop workers, rename current log file with adding current datetime and start new workers.  
Example : x.log will be renamed to x_201605281900.log

### Stopping server

Ctrl+C on console mode, SIGINT, SIGTERM or SIGBREAK signals will stop workers and main process.


### Sending client log entries

Send simple HTTP POST request to the server.

Example :

```sh
curl -X POST \
     --data "This line will be write in the output file open by the Log-HTTP2File server" \
     --header "Content-Type:text/plain" \
      http://localhost:8142
```

### Monitoring log

You should look at [log.io](http://logio.org) for log monitoring.


## License

Log-HTTP2File is available under the [MIT license](http://opensource.org/licenses/MIT).

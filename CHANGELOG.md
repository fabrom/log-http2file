# ChangeLog

## 2016-05-27 - 0.2.0

- introduce command line _log-http2file_
- options and arguments management
```sh
log-http2file v.0.2.0 - Simple HTTP server to log POST request content to file
Author: Fabrice Romand <fabrice.romand@gmail.com> - Homepage: https://github.com/fabrom/log-http2file
Report bugs on https://github.com/fabrom/log-http2file/issues

  Usage: log-http2file [options] <outputfile>

  Options:

    -h, --help         output usage information
    -V, --version      output the version number
    -w, --workers <n>  how many listening workers
    -p, --port <n>     listening port
```


## 2016-05-26 - 0.1.2

- manage signal SIGHUP (close output file, rename output file and restart workers)
- manage signals SIGINT, SIGTERM and SIGBREAK

## 2016-05-25 - 0.1.1

- manage string message and JSON data
- include remote info (user, agent, address) in JSON data
- Fix HTTP response

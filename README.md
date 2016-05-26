# Log-HTTP2File

_Simple HTTP server to log POST request content to file_

## Installation

To download a zip, go to the Log-HTTP2File on Github


## Usage

### Starting server

```sh
npm start [options] output_file_path
```

Look at [forever](https://github.com/foreverjs/forever) tool for running this server in production.

##### Options

- **-w** _workers count_          (default=(CPUs/2)+1)
- **-p** _listening port_         (default=8142)

### Sending client log entries

Send simple HTTP POST request to the server.

Example :

```sh
curl -X POST \
     --data "This line will be write in the output file open by the Log-HTTP2File server" \
     --header "Content-Type:text/plain" \
      http://localhost:8142
```

### Monitoring

You should look at [log.io](http://logio.org) for log monitoring.


## License

Log-HTTP2File is available under the [MIT license](http://opensource.org/licenses/MIT).

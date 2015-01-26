# node-soap

```js
var SOAPClient = require('node-soap');

var client = SOAPClient({
	hostname: 'localhost',
	port: 7878,
	username: 'myusername',
	password: '123456'
}, function (response) {
	response.setEncoding('utf-8');
	response.on('data', function(data) {
		console.log(data);
	});
});

client.addNamespace('ns1', 'urn:TC');

client.method('executeCommand', '.send items', 'ns1', 'command');
```
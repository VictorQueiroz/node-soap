'use strict';

var _ = require('underscore');
var http = require('http');
var defaults = {
	port: 7878,
	method: 'POST'
};

function SOAPClient (options, fn) {
	fn = this.fn = fn;
	options = this.options = _.extend({}, defaults, options);

	var deferred;

	this.namespaces = '';
	this.methods = '';
	this.body = function (options) {
		return "<?xml version=\"1.0\" encoding=\"utf-8\"?>" +
			"<SOAP-ENV:Envelope " +
			"xmlns:SOAP-ENV=\"http://schemas.xmlsoap.org/soap/envelope\/\" " +
			"xmlns:xsi=\"http://www.w3.org/1999/XMLSchema-instance\" " +
			"xmlns:xsd=\"http://www.w3.org/1999/XMLSchema\" " +
			options.namespaces +
			">" +

			"<SOAP-ENV:Body>" +
				options.methods +
			"</SOAP-ENV:Body>" +

		'</SOAP-ENV:Envelope>';
	};

	this.newRequest();
	
	return this;
}

SOAPClient.prototype.newRequest = function () {
	var options = this.options;

	this.req = http.request({
		hostname: options.hostname,
		port: options.port,
		method: options.method,
		auth: (options.username + ':' + options.password)
	}, this.fn);

	return this;
};

SOAPClient.prototype.method = function (methodName, command, namespace, param) {
	var method = '';

	var tagName = namespace + ':' + methodName;

	method += '<' + method + tagName;

	// A space, in case we need to add up more methods.
	method += ' ';

	method += '>';

	method += '<' + param + '>';
		method += command;
	method += '</' + param + '>';

	method += '</' + tagName + '>';

	this.methods = method;
	this.newRequest();
	this.end();
};

SOAPClient.prototype.addNamespace = function (namespace, value) {
	var str = 'xmlns:' + namespace + '="';
	str += value;
	str += "\" ";

	this.namespaces += str;
};

SOAPClient.prototype.write = function () {
	this.req.write(this.body(this));
};

SOAPClient.prototype.end = function () {
	this.write();
	this.req.end();
};

module.exports = SOAPClient;
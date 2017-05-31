var express = require("express");
var espeak = require("espeak");
var url = require("url");
var qs = require("querystring");

var app = express();

app.get("/speak", function (req, res) {
	var parsed = url.parse(req.url);
	var query = qs.parse(parsed.query);
	var text = query.text || "";

	console.log("speak " + text);

	espeak.speak(text, [ "-z", "-p 99" ], function(err, wav) {
		if (err) return console.error(err);
		res.writeHead(200);
		res.end(wav.toDataUri());
	});
});

app.use("/", express.static("./"));
app.use("/main", express.static("main.html"));

var server = app.listen(3140, function () {
	var host = server.address().address;
	var port = server.address().port;

	console.log("listening at " + host + ":" + port);
});

if (document.location.hostname == "0x1d00ffff.github.io") {
	console.log('using gtag');
	window.dataLayer = window.dataLayer || [];
	function gtag(){dataLayer.push(arguments);}
	gtag('js', new Date());

	gtag('config', 'UA-117165354-1');
} else { 
	console.log('wrapped gtag')
	_gaq = {
		push: function(arg) {
			console.log("ga:", arg)
		}
	}
}

Vue.service("image", {
	services: ["q"],
	methods: {
		// can pass in a file or blob, the blob should have annotated metadata similar to file like "type"
		// https://developer.mozilla.org/en-US/docs/Web/API/FileReader
		resize: function(file, maxWidth, maxHeight) {
			var self = this;
			var reader = new FileReader();
			var promise = this.$services.q.defer();
			reader.onload = function(readerEvent) {
				var applyUrl = function(dataUrl) {
					var result = {};
					result.url = dataUrl;
					result.file = self.urlToBlob(dataUrl);
					result.file.name = file.name;
					// this is not allowed in minified mode
					// it "should" be the same given the code
					// if there is ever a problem with the type not matching, we can pass it along to urlToBlob and use the file type over the internal type
					//result.file.type = file.type;
					result.name = file.name;
					result.type = file.type ? file.type : "application/octet-stream";
					promise.resolve(result);
				}
				// if we have an image
				if (file.type && file.type.indexOf("image/") == 0) {
					var image = new Image();
					image.onload = function (imageEvent) {
						var canvas = document.createElement('canvas');
						var width = image.width;
						var height = image.height;
						var factor = 1;
						if (maxWidth != null && width > maxWidth) {
							factor = maxWidth / width;
						}
						if (maxHeight != null && height > maxHeight) {
							factor = Math.min(factor, maxHeight / height);
						}
						width *= factor;
						height *= factor;
						canvas.width = width;
						canvas.height = height;
						canvas.getContext('2d').drawImage(image, 0, 0, width, height);
						// try to retrieve as the original format
						var dataUrl = canvas.toDataURL(file.type ? file.type : "image/jpeg");
						applyUrl(dataUrl);
					};
					image.src = readerEvent.target.result;
				}
				else {
					applyUrl(readerEvent.target.result);
				}
			};
			reader.readAsDataURL(file);
			return promise;
		},
		urlToBlob: function(dataURL) {
			var BASE64_MARKER = ';base64,';
			if (dataURL.indexOf(BASE64_MARKER) < 0) {
				var parts = dataURL.split(',');
				var contentType = parts[0].split(':')[1];
				var raw = parts[1];
				return new Blob([raw], {type: contentType});
			}
			else {
				var parts = dataURL.split(BASE64_MARKER);
				var contentType = parts[0].split(':')[1];
				return this.base64ToBlob(parts[1], contentType);
			}
		},
		base64ToBlob: function(base, contentType) {
			var raw = window.atob(base);
			var rawLength = raw.length;
			var uInt8Array = new Uint8Array(rawLength);
			for (var i = 0; i < rawLength; ++i) {
				uInt8Array[i] = raw.charCodeAt(i);
			}
			return new Blob([uInt8Array], {type: contentType});
		},
	}	
});
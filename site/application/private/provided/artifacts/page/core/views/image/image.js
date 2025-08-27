if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

Vue.view("page-image", {
	category: "Media",
	name: "Image",
	description: "Position an image",
	icon: "page/core/images/image.svg",
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
		/*, 
		contentType: {
			type: String,
			required: false
		},
		// you can map the bytes
		content: {
			type: Object,
			required: false
		},
		// the "content" can be a blob
		// however, a blob/file/... is not stringifiable and will end up as an empty object in the JSON
		// that means, when you dynamically change the blob based on state, the router can not determine that it is a _different_ blob and nothing will rerender
		// specifically for that, you can add an id here (like an attachment id) which identifies the blob
		contentId: {
			required: false
		}*/
	},
	activate: function(done) {
		if (this.edit) {
			done();
		}
		var self = this;
		var promises = [];
		if (this.cell.state.inline && (this.cell.state.href || this.href)) {
			var self = this;
			var href = this.cell.state.href ? this.cell.state.href : this.href;
			// if not absolute, make it so
			if (href.indexOf("http://") != 0 && href.indexOf("https://") != 0 && href.indexOf("/") != 0) {
				href = "${server.root()}" + href;
			}
			nabu.utils.ajax({ url: href }).then(function(response) {
				self.inlineContent = response.responseText;
			});
		}
		// we want to convert it to base64
		if (this.content) {
			var blob = this.content instanceof Blob ? this.content : nabu.utils.binary.blob(this.content, this.contentType ? this.contentType : "image/jpeg");
			var reader = new FileReader();
			reader.readAsDataURL(blob);
			var promise = new nabu.utils.promise();
			promises.push(promise);
			reader.onload = function() {
				var result = reader.result;
				var index = result.indexOf(",");
				self.encodedData = result;// result.substring(index + 1);
				promise.resolve();
			};
		}
		this.$services.q.all(promises).then(done, done);
	},
	data: function() {
		return {
			inlineContent: null,
			encodedData: null,
			href: null
		}
	},
	computed: {
		title: function() {
			return this.cell.state.title ? this.$services.page.interpret(this.$services.page.translate(this.cell.state.title), this) : null;
		},
		emptyImage: function() {
			var defaultPlaceholder = application.configuration.root + 'resources/modules/image/placeholder.svg';
			return this.cell.state.emptyImage ? this.$services.page.interpret(this.cell.state.emptyImage) : defaultPlaceholder;
		},
		// we put this in a computed because we want this to be reactive
		calculatedUrl: function() {
			if (this.cell.state.imageType == "operation") {
				this.calculateRESTUrl();
			}
			else if (this.cell.state.imageType == "static") {
				this.calculateFixedUrl();
			}
			else if (this.cell.state.imageType == "bytes") {
				this.calculateByteUrl();
			}
			else if (this.cell.state.imageType == "variable") {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.cell.state.imageUrlVariable ? pageInstance.get(this.cell.state.imageUrlVariable) : null;
			}
			return this.href;
		}
	},
	// replaced with computed for reactivity!
	/*
	created: function() {
		if (this.cell.state.imageType == "operation") {
			this.calculateRESTUrl();
		}
		else if (this.cell.state.imageType == "static") {
			this.calculateFixedUrl();
		}
		else if (this.cell.state.imageType == "bytes") {
			this.calculateByteUrl();
		}
	},
	*/
	methods: {
		calculateByteUrl: function() {
			if (this.cell.state.byteValue) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				if (pageInstance) {
					var self = this;
//					var blob = pageInstance.get(this.cell.state.byteValue);
					var blob = this.$services.page.getBindingValue(pageInstance, this.cell.state.byteValue);
					if (blob) {
						var contentType = null;
						if (this.cell.state.contentTypeValue) {
							//contentType = pageInstance.get(this.cell.state.contentTypeValue);		
							contentType = this.$services.page.getBindingValue(pageInstance, this.cell.state.contentTypeValue);
						}
						if (!contentType) {
							contentType = "image/jpeg";
						}
						blob = blob instanceof Blob ? blob : nabu.utils.binary.blob(blob, contentType);
						var reader = new FileReader();
						reader.readAsDataURL(blob);
						var promise = new nabu.utils.promise();
						reader.onload = function() {
							var result = reader.result;
							var index = result.indexOf(",");
							self.href = result;// result.substring(index + 1);
							promise.resolve();
						};
						return promise;
					}
				}
			}
		},
		calculateFixedUrl: function() {
			var href = null;
			if (this.cell.state.href) {
				href = this.$services.page.interpret(this.cell.state.href, this);
			}
			if (href && href.substring(0, 5) == "data:") {
				this.href = href;
				return href;
			}
			// if the href is not an absolute one (either globally absolute or application absolute), we inject the server root
			if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && href.substring(0, 1) != "/") {
				href = application.configuration.root + href;
			}
			// make it absolute if needed
			if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && this.cell.state.absolute) {
				href = application.configuration.url + href;
			}
			// on mobile we don't want absolute paths starting with "/", otherwise it won't fetch from the file system
			else if (href && href.substring(0, 7) != "http://" && href.substring(0, 8) != "https://" && ${environment("mobile") == true} && href.indexOf("/") == 0) {
				href = href.substring(1);
			}
			if (!href && this.edit) {
				href = application.configuration.root + "resources/modules/image/placeholder.svg";
			}
			this.href = href;
		},
		calculateRESTUrl: function() {
			if (this.cell.state.imageOperation) {
				var operation = this.$services.swagger.operations[this.cell.state.imageOperation];
				var properties = this.$services.page.getBindings(this.cell.state.bindings, this);
				var self = this;
				// we need temporary credentials
				if (operation["x-temporary-id"] && operation["x-temporary-secret"] && this.$services.user && this.$services.user.ltp) {
					this.$services.user.ltp(operation.id).then(function(authorization) {
						properties[operation["x-temporary-id"]] = authorization.authenticationId;
						properties[operation["x-temporary-secret"]] = authorization.secret;
						self.href = self.$services.swagger.parameters(operation.id, properties).url;
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var serviceContext = pageInstance.getServiceContext();
						if (serviceContext) {
							self.href += (self.href.indexOf("?") >= 0 ? "&" : "?") + "$serviceContext=" + serviceContext;
						}
					}, function(e) {
						self.href = null;
						console.log("Could not get ltp for", operation.id, e);
					});
				}
				else {
					self.href = self.$services.swagger.properties(operation.id, properties).url;
					var pageInstance = self.$services.page.getPageInstance(self.page, self);
					var serviceContext = pageInstance.getServiceContext();
					if (serviceContext) {
						self.href += (self.href.indexOf("?") >= 0 ? "&" : "?") + "$serviceContext=" + serviceContext;
					}
				}
			}
		},
		getChildComponents: function() {
			return [{
				title: "Image",
				name: "image",
				component: "image"
			}];
		},
		configurator: function() {
			return "page-image-configure";
		}
	}
})

Vue.component("page-image-configure", {
	template: "#page-image-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	created: function() {
		this.load();
		if (!this.cell.state.bindings) {
			Vue.set(this.cell.state, "bindings", {});
		}
	},
	computed: {
		hasPrevious: function() {
			var self = this;
			var entry = this.images.filter(function(x) {
				return x.relativePath == self.cell.state.href;
			})[0];
			return entry && this.images.indexOf(entry) > 0;
		},
		hasNext: function() {
			if (!this.cell.state.href && this.images.length > 0) {
				return true;
			}
			var self = this;
			var entry = this.images.filter(function(x) {
				return x.relativePath == self.cell.state.href;
			})[0];
			return entry && this.images.indexOf(entry) < this.images.length - 1;
		}
	},
	data: function() {
		return {
			images: [],
			files: []
		}
	},
	methods: {
		next: function() {
			var self = this;
			if (!this.cell.state.href) {
				Vue.set(this.cell.state, "href", this.images[0].relativePath);
			}
			else {
				var entry = this.images.filter(function(x) {
					return x.relativePath == self.cell.state.href;
				})[0];
				if (entry) {
					var index = this.images.indexOf(entry);
					this.cell.state.href = this.images[index + 1].relativePath;
				}
			}
		},
		previous: function() {
			var self = this;
			var entry = this.images.filter(function(x) {
				return x.relativePath == self.cell.state.href;
			})[0];
			if (entry) {
				var index = this.images.indexOf(entry);
				this.cell.state.href = this.images[index - 1].relativePath;
			}
		},
		load: function() {
			var self = this;
			return this.$services.swagger.execute("nabu.web.page.core.v2.rest.resource.list", {path:this.cell.state.imagePath}).then(function(list) {
				self.images.splice(0);
				if (list && list.resources) {
					nabu.utils.arrays.merge(self.images, list.resources);
				}
			});
		},
		upload: function() {
			var self = this;
			this.$services.swagger.execute("nabu.web.page.core.v2.rest.resource.create", { path:this.cell.state.imagePath, body: this.files[0] }).then(function(result) {
				self.load();
				if (result && result.relativePath) {
					self.cell.state.href = result.relativePath;
				}
				self.files.splice(0, self.files.length);
			});
		},
		getAllKeys: function(value) {
			var keys = [];
			nabu.utils.arrays.merge(keys, this.$services.page.getAllAvailableKeys(this.page, true));
			if (value) {
				keys = keys.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			keys.sort();
			return keys;
		}
	},
	watch: {
		'cell.state.imagePath': function() {
			this.load();
		}
	}
})
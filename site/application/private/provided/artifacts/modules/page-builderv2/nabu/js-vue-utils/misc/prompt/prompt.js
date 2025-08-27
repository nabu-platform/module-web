if (!nabu) { var nabu = {}; }
if (!nabu.utils) { nabu.utils = {}; }
if (!nabu.utils.vue) { nabu.utils.vue = {}; }

nabu.utils.vue.Loader = Vue.component("n-loader", {
	template: "<span class='n-icon n-icon-spinner n-loader fa spinner fas fa-spinner' style='display: block; text-align: center; margin: auto;'></span>"
})

nabu.utils.vue.prompt = function(render, parameters) {
	var root = document.createElement("div");
	root.setAttribute("class", "n-prompt is-modal" + (parameters && parameters.class ? " " + parameters.class : ""));
	document.body.appendChild(root);
	
	var container;
	
	if (parameters && parameters.raw) {
		container = root;
	}
	else {
		var container = document.createElement("div");
		container.setAttribute("class", "n-prompt-container is-modal-content");
		root.appendChild(container);
	}
	
	var escapeListener = function(event) {
		if (event.keyCode == 27) {
			document.body.removeChild(root);
			document.removeEventListener("keydown", escapeListener);
			promise.reject();
		}
	};
	document.addEventListener("keydown", escapeListener);

	root.addEventListener("click", function(event) {
		if (event.target == root) {
			document.body.removeChild(root);
			document.removeEventListener("click", escapeListener);
			promise.reject();
		}
	});
	
	var promise = new nabu.utils.promise();
	
	if (parameters && parameters.slow && this.$render) {
		this.$render({ target: container, content: new nabu.utils.vue.Loader() });
	}
	
	var removeRoot = function() {
		if (root.parentNode == document.body) {
			document.body.removeChild(root);
			document.removeEventListener("keydown", escapeListener);
		}
	}
	
	var activate = function(component) {
		component.$resolve = function(object) {
			removeRoot();
			if (!promise.state) {
				promise.resolve(object);
			}
		};
		component.$reject = function(object) {
			removeRoot();
			if (!promise.state) {
				promise.reject(object);
			}
		}
		// if someone on the outside resolves the promise, make sure we call the functions
		promise.then(removeRoot, removeRoot);
	};
	if (typeof(render) == "string" && render.indexOf("#") < 0 && this.$services && this.$services.router) {
		this.$services.router.route(render, parameters, container).then(activate);
	}
	else if (this.$render) {
		this.$render({ target: container, content: render, activate: activate});
	}
	else {
		nabu.utils.vue.render({ target: container, content: render, activate: activate});
	}
	return promise;
};

// parameters are:
// - message: the message to show
// - type: question, warning, error
// - ok: the text for the ok button
// - cancel: the text for the cancel button
// - variant: the variant to use
nabu.utils.vue.confirm = function(parameters) {
	return nabu.utils.vue.prompt.bind(this)(function() {
		var component = Vue.extend({ 
			template: "#n-confirm",
			data: function() {
				return {
					title: null,
					ok: null,
					cancel: null,
					type: null,
					message: null,
					rejectable: true
				}
			},
			methods: {
				getIcon: function() {
					if (this.type == "question") {
						return "question-circle-o";
					}
					else if (this.type == "warning") {
						return "exclamation-triangle";
					}
					else if (this.type == "error") {
						return "exclamation-circle";
					}
				},
				resolve: function() {
					this.$resolve();
				},
				translate: function(value) {
					// slightly messed up regex to avoid %{} replacement if templating is turned on (backwards compatibility)
					return parameters && parameters.translator ? parameters.translator(value) : 
						(value && value.replace ? value.replace(/%[{](?:[a-zA-Z]+[:]+|)([^}]+)}/, "$1") : value);
				}
			}
		});
		return new component({ data: parameters });
	}, {class:"is-variant-" + (this.variant ? this.variant : "confirm")});
};

nabu.utils.vue.wait = function(parameters) {
	return nabu.utils.vue.prompt.bind(this)(function() {
		var component = Vue.extend({ 
			template: "#n-confirm",
			data: function() {
				return {
					title: null,
					ok: null,
					cancel: null,
					type: null,
					message: null,
					rejectable: false,
					failed: false,
					result: null
				}
			},
			activate: function(done) {
				var self = this;
				parameters.promise.then(function(result) {
					if (parameters.success != null) {
						nabu.utils.objects.merge(self, parameters.success);
					}
					self.result = result;
					done();
					if (parameters.success == null) {
						self.resolve();
					}
				}, function(result) {
					if (parameters.failure != null) {
						nabu.utils.objects.merge(self, parameters.failure);
					}
					self.failed = true;
					self.result = result;
					done();
					if (parameters.failure == null) {
						self.resolve();
					}
				});
			},
			methods: {
				resolve: function() {
					if (this.failed) {
						this.$reject(this.result);
					}
					else {
						this.$resolve(this.result);
					}
				}
			}
		});
		return new component({ data: parameters});
	}, { slow: true, class: "n-prompt-wait" });
};

Vue.mixin({
	computed: {
		$prompt: function() { return nabu.utils.vue.prompt },
		$confirm: function() { return nabu.utils.vue.confirm },
		$wait: function() { return nabu.utils.vue.wait }
	}
});

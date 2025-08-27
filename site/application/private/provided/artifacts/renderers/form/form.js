nabu.page.provide("page-renderer", {
	title: "Form",
	name: "form",
	type: ["row", "cell"],
	component: "renderer-form",
	configuration: "renderer-form-configure",
	getTriggers: function(target, pageInstance, $services) {
		var triggers = {};
		triggers.update = {
			type: "object"
		}
		return triggers;
	},
	// can inject state into the page so we can manipulate it
	getState: function(container, page, pageParameters, $services) {
		if (container.form) {
			var result;
			if (container.form.array && container.form.formType == "array") {
				var array = container.form.array;
				if (array.indexOf("page.") == 0) {
					array = array.substring("page.".length);
				}
				var childDefinition = $services.page.getChildDefinition({properties:pageParameters}, array);
				result = childDefinition && childDefinition.items && childDefinition.items ? childDefinition.items : {};
			}
			else if (container.form.operation && container.form.formType == "operation") {
				var operationId = container.form.operation;
				result = application.services.page.getSwaggerOperationInputDefinition(operationId);
			}
			else if (container.form.formType == "function" && container.form.function) {
				result = $services.page.getFunctionInput(container.form.function);
			}
			else {
				result = {};
			}
			if (!result.properties) {
				result.properties = {};
			}
			result.properties.readOnly = {
				type: "boolean"
			};
			if (container.form.fields) {
				container.form.fields.forEach(function(x) {
					var definition = x.type ? $services.swagger.resolve(x.type) : null;
					if (definition) {
						result.properties[x.name] = {
							type: "object",
							properties:definition.properties
						}
					}
					else {
						result.properties[x.name] = {
							type: x.type ? x.type : "string"
						}
					}
				});
			}
			if (container.form.translatable) {
				result.properties.language = {
					type: "string"
				};
				result.properties.translations = {
					type: "array",
					items: {
						properties: {
							language: {
								type: "string"
							},
							name: {
								type: "string"
							},
							translation: {
								type: "string"
							}
						}
					}
				}
			}
			return result;
		}
		else {
			return {};
		}
	},
	// can emit events
	// e.g. a success event for form submit
	// an error event
	// a submit event (with the input state)
	getEvents: function(container) {
		var result = {};
		if (container.form) {
			var operationId = container.form.operation;
			if (operationId) {
				if (container.form.submitEvent) {
					result[container.form.submitEvent] = application.services.page.getSwaggerOperationInputDefinition(operationId);
				}
				if (container.form.successEvent) {
					result[container.form.successEvent] = application.services.page.getSwaggerOperationOutputDefinition(operationId);
				}
			}
		}
		return result;
	},
	// return the child components in play for the given container
	// these can be added to the list of stuff to style
	getChildComponents: function(container) {
		return [{
			title: "Form",
			name: "form",
			component: "form"
		}, {
			title: "Form Container",
			name: "form-container",
			component: "form-section"
		}];
	},
	// TODO: add the output definition!
	getActions: function(container) {
		var actions = [];
		actions.push({
			title: "Validate",
			name: "validate"
		});
		if (container && container.form && (container.form.operation || container.form.function || (container.form.fields && container.form.fields.length > 0))) {
			var output = null;
			if (container.form.operation && container.form.formType == "operation") {
				var operationId = container.form.operation;
				output = application.services.page.getSwaggerOperationOutputDefinition(operationId);
			}
			actions.push({
				title: "Submit",
				name: "submit",
				input: {
					skipValidate: {
						type: "boolean"
					}
				},
				output: output,
				errors: ["submit", "validate"]
			});
		}
		actions.push({
			title: "Toggle Readonly",
			name: "toggle-readonly"
		});
		if (container && container.form && container.form.translatable) {
			actions.push({
				title: "Switch Language",
				name: "switch-language",
				input: {
					language: {
						type: "string"
					}
				}
			});	
		}
		return actions;
	}
});


Vue.component("renderer-form", {
	template: "#renderer-form",
	mixins: [nabu.page.mixins.renderer],
	props: {
		page: {
			type: Object,
			required: true
		},
		// the target (cell or row)
		target: {
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
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		}
	},
	created: function() {
		var self = this;
		// initialize the read only
		Vue.set(this.state, "readOnly", this.target.form && this.target.form.readOnly);
		if (this.target.form && this.target.form.translatable) {
			Vue.set(this.state, "language", null);
			Vue.set(this.state, "translations", []);
		}
		this.mergeParameters();
		if (this.target.form && this.target.form.noInlineErrors) {
			this.mode = null;
		}
		else {
			this.mode = "component";
		}
		// if we have a form on an operation, we likely have a "body" in our state
		// we want to be able to pass that around by reference
		if (this.target.form && this.target.form.formType == "operation" && this.state.body == null) {
			Vue.set(this.state, "body", {});
		}
	},
	mounted: function() {
		// trigger a submit
		if (this.target.form && this.target.form.triggerEvent) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			
			var self = this;
			this.subscriptions.push(pageInstance.subscribe(this.target.form.triggerEvent, function() {
				// always fire the submit if available
				if (self.target.form.submitEvent) {
					pageInstance.emit(self.target.form.submitEvent, self.state);
				}
			}));
		}
	},
	data: function() {
		return {
			messages: [],
			state: {},
			subscriptions: [],
			mode: null
		}
	},
	methods: {
		mergeParameters: function() {
			var self = this;
			if (this.parameters) {
				// we want to make sure something actually changed, otherwise we might reset pending changes!
				if (this.target.form.enableParameterWatching) {
					var stringified = JSON.stringify(this.parameters);
					if (this.lastParameters != null) {
						if (stringified == this.lastParameters) {
							return;
						}
					}
					this.lastParameters = stringified;
				}
				Object.keys(this.parameters).forEach(function(key) {
					if (!self.target.form.bindingByReference) {
						Vue.set(self.state, key, self.$services.page.smartClone(self.parameters[key]));
					}
					else {
						Vue.set(self.state, key, self.parameters[key]);
					}
					//Vue.set(self.state, key, !self.target.form.bindingByReference ? JSON.parse(JSON.stringify(self.parameters[key])) : self.parameters[key]);
					//Vue.set(self.state, key, self.parameters[key]);
				});
			}
		},
		getRuntimeState: function() {
			return this.state;		
		},
		update: function() {
			this.$services.triggerable.trigger(this.target, "update", {}, this);
			if (this.target.form.submitOnChange) {
				this.submit();
			}
		},
		submit: function() {
			var self = this;
			this.messages.splice(0);
			var errorHandler = function(error) {
				self.error = "Form submission failed";
				// if we get an XMLHTTPResponse thingy, parse it
				if (error && error.responseText) {
					error = JSON.parse(error.responseText);
				}
				// we get a (hopefully) standardized event back
				if (error) {
					// we nog longer use code but have switched to type
					if (!error.code) {
						error.code = error.type;
					}
					if (!error.code) {
						error.code = "HTTP-" + (error.status != null ? error.status : 500);
					}
					try {
						if (self.target.form.errorEvent) {
							var pageInstance = self.$services.page.getPageInstance(self.page, self);
							pageInstance.emit(self.target.form.errorEvent, error);
						}
						var codes = self.target.form.codes ? self.target.form.codes : [];
						var applicableCode = codes.filter(function(x) { return x.code == error.code })[0];
						var translated = applicableCode 
							? self.$services.page.translate(applicableCode.title)
							: self.$services.page.translateErrorCode(error.code, error.title ? error.title : error.message);
						self.error = translated;
						self.messages.push({
							type: "request",
							severity: "error",
							title: translated,
							code: error.code
						})
					}
					catch (exception) {
						self.messages.push({
							type: "request",
							severity: "error",
							title: self.$services.page.translateErrorCode(error.status ? "HTTP-" + error.status : "HTTP-500")
						})
					}
				}
				else {
					self.messages.push({
						type: "request",
						severity: "error",
						title: self.$services.page.translateErrorCode("HTTP-500")
					});
				}
				self.doingIt = false;
				stop(self.error);
			};
			
			var context = null;
			if (this.target.form.formType == "operation") {
				context = this.target.form.operation;
			}
			else if (this.target.form.formType == "array") {
				context = this.target.form.array;
			}
			else if (this.target.form.formType == "function") {
				context = this.target.form.function;
			}
			else {
				context = this.page.content.name;
			}
			self.$services.analysis.push({
				event: "submit",
				category: "form",
				component: self.target.analysisId ? self.target.analysisId : "form-" + self.target.id,
				context: context,
				page: self.$services.page.getRootPage(self.$services.page.getPageInstance(self.page, self)).page.content.name,
				data: {
					formType: this.target.form.formType
				}
			});
			
			// do an operation call
			if (this.target.form.operation && this.target.form.formType == "operation") {
				// anything that is not a get should be autologged for analysis
				try {
					var cloned = nabu.utils.objects.clone(this.state);
					if (!cloned["$serviceContext"]) {
						var pageInstance = this.$services.page.getPageInstance(this.page, this);
						cloned["$serviceContext"] = pageInstance.getServiceContext();
					}
					// TODO: test first
					//cloned = this.$services.page.nullify(cloned);
					return this.$services.swagger.execute(this.target.form.operation, cloned).then(function(result) {
						// synchronize the changes back to the binding if relevant
						if (self.target.form.synchronize) {
							self.$services.page.applyRendererParameters(self.$services.page.getPageInstance(self.page, self), self.target, self.state);
						}
					}, errorHandler);
				}
				catch (exception) {
					console.error("Can not submit form", exception);
					return self.$services.q.reject(exception);
				}
			}
			else if (this.target.form.array && this.target.form.formType == "array") {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				var current = pageInstance.get(this.target.form.array);
				if (current == null) {
					pageInstance.set(this.target.form.array, []);
					current = pageInstance.get(this.target.form.array);
				}
				current.push(this.state);
				// synchronize the changes back to the binding if relevant
				if (self.target.form.synchronize) {
					self.$services.page.applyRendererParameters(self.$services.page.getPageInstance(self.page, self), self.target, self.state);
				}
			}
			else if (this.target.form.function && this.target.form.formType == "function") {
				var func = this.$services.page.getRunnableFunction(this.target.form.function);
				if (!func) {
					throw "Could not find function: " + this.target.form.function; 
				}
				var promise = this.$services.q.defer();
				var result = this.$services.page.runFunction(func, this.state, this, promise);
				
				// synchronize the changes back to the binding if relevant
				if (self.target.form.synchronize) {
					promise.then(function(x) {
						self.$services.page.applyRendererParameters(self.$services.page.getPageInstance(self.page, self), self.target, self.state);
					})
				}
				
				promise.then(function(){}, errorHandler);
				
				// not yet used
				if (this.target.form.functionOutputEvent && false) {
					var def = this.$services.page.getFunctionDefinition(this.target.form.function);
					var pageInstance = this.$services.page.getPageInstance(this.page, this);
					if (def.async) {
						promise.then(function(asyncResult) {
							pageInstance.emit(self.target.form.functionOutputEvent, asyncResult ? asyncResult : {});
						});
					}
					else {
						pageInstance.emit(this.target.form.functionOutputEvent, result ? result : {});
					}
				}
				return promise;
			}
			else if (this.target.form.fields && this.target.form.fields.length && this.target.form.formType == "page") {
				this.$services.page.applyRendererParameters(this.$services.page.getPageInstance(this.page, this), this.target, this.state);
			}
		},
		runAction: function(name, input) {
			var self = this;
			if (name == "submit") {
				var promise = this.$services.q.defer();
				var validationPromise = null;
				if (input && input.skipValidate) {
					validationPromise = this.$services.q.resolve();
				}
				else {
					validationPromise = this.runAction("validate");
				}
				validationPromise.then(function() {
					var result = self.submit();
					if (result && result.then) {
						result.then(promise, function(error) {
							promise.reject({errorType: "submit", error: error});
						});
					}
					else {
						promise.resolve();
					}
				}, function(error) {
					self.$services.triggerable.trigger(self.target, "validate:error", {}, self);
					promise.reject({errorType: "validate", error: error});
				});
				return promise;
			}
			else if (name == "validate") {
				// you can set a custom component group to only validate those particular elements?
				var componentGroup = this.target.form.componentGroup ? this.target.form.componentGroup : "form";
				var promises = [];
				var messages = [];
				var codes = self.target.form.codes ? self.target.form.codes : [];
				this.$el.querySelectorAll("[component-group='" + componentGroup + "']").forEach(function(x) {
					var result = x.__vue__.validate();
					
					// we likely have the codes on the "wrapper" component
					// vue can render multiple components on the same $el (e.g. if the root of a component is another component)
					// this is the case for form components in the page, so we likely find it in the parent
					var localCodes = null;
					var component = x.__vue__;
					while (component && !localCodes) {
						localCodes = component.codes;
						component = component.$parent;
						if (!component || component.$el != x) {
							break;
						}
					}
					if (!localCodes) {
						localCodes = [];
					}
					//var localCodes = x.__vue__.codes ? x.__vue__.codes : (x.__vue__.$parent && x.__vue__.$parent.codes ? x.__vue__.$parent.codes : []);
					
					var allCodes = [];
					// the LAST hit wins, so we want the most specific one to win...
					nabu.utils.arrays.merge(allCodes, codes);
					nabu.utils.arrays.merge(allCodes, localCodes);
					
					// we want to clone them so we don't update the original by reference
					// then we want to interpret them!
					var allCodes = allCodes.map(function(x) {
						var cloned = JSON.parse(JSON.stringify(x));
						cloned.title = self.$services.page.translate(self.$services.page.interpret(cloned.title, self));
						return cloned;
					});
					
					var translateMessages = function(messages) {
						messages.forEach(function(message) {
							message.title = self.$services.page.translate(message.title);
						});
					};
					
					// these are currently not compatible with the all() promises bundler... :(
					if (result && result.then) {
						var localPromise = self.$services.q.defer();
						promises.push(localPromise);
						result.then(function(x) {
							nabu.utils.vue.form.rewriteCodes(x, allCodes);
							nabu.utils.arrays.merge(messages, x);
							translateMessages(x);
							localPromise.resolve(x);
						}, localPromise);
					}
					else if (result instanceof Array) {
						nabu.utils.vue.form.rewriteCodes(result, allCodes);	
						nabu.utils.arrays.merge(messages, result);
						translateMessages(messages);
					}
				});
				var promise = this.$services.q.defer();
				this.$services.q.all(promises).then(function() {
					if (messages.length == 0) {
						promise.resolve();
					}
					else {
						promise.reject({errorType: "validate", messages: messages});
					}
				}, promise);
				return promise;
			}
			else if (name == "toggle-readonly") {
				// you can set a custom component group to only validate those particular elements?
				var componentGroup = this.target.form.componentGroup ? this.target.form.componentGroup : "form";
				this.$el.querySelectorAll("[component-group='" + componentGroup + "']").forEach(function(x) {
					var component = x.__vue__;
					while (component) {
						if (Object.keys(component).indexOf("editable") >= 0) {
							component.editable = !component.editable;
							break;
						}
						else {
							component = component.$parent;
						}
					}
				});
				this.state.readOnly = !this.state.readOnly;
			}
			else if (name == "switch-language") {
				// you can set a custom component group to only validate those particular elements?
				var componentGroup = this.target.form.componentGroup ? this.target.form.componentGroup : "form";
				this.state.language = input ? input.language : null;
				this.$el.querySelectorAll("[component-group='" + componentGroup + "']").forEach(function(x) {
					var component = x.__vue__;
					while (component) {
						if (Object.keys(component).indexOf("language") >= 0) {
							component.language = self.state.language;
							break;
						}
						else {
							component = component.$parent;
						}
					}
				});
			}
		}
	},
	watch: {
		parameters: {
			deep: true,
			handler: function() {
				if (this.target.form.enableParameterWatching) {
					this.mergeParameters();
				}
			}
		}
	}
});
 
Vue.component("renderer-form-configure", {
	template: "#renderer-form-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		// the target (cell or row)
		target: {
			type: Object,
			required: true
		}
	},
	created: function() {
		// normalize
		if (!this.target.form) {
			Vue.set(this.target, "form", {});
		}
		if (!this.target.form.bindings) {
			Vue.set(this.target.form, "bindings", {});
		}
		if (!this.target.form.fields) {
			Vue.set(this.target.form, "fields", []);
		}
	},
	computed: {
		definition: function() {
			
		}
	},
	methods: {
		getOperations: function(name) {
			var self = this;
			return this.$services.page.getOperations(function(operation) {
				// must be a put, post, patch or delete
				return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post" || operation.method.toLowerCase() == "delete" || operation.method.toLowerCase() == "patch")
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0);
			});
		},
		getParameterTypes: function(value) {
			var types = ['string', 'boolean', 'number', 'integer'];
			nabu.utils.arrays.merge(types, Object.keys(this.$services.swagger.swagger.definitions));
			if (value) {
				types = types.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return types;
		},
	}
});
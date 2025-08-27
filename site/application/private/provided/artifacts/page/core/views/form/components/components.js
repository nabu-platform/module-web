if (!nabu) { var nabu = {} };
if (!nabu.page) { nabu.page = {} };
if (!nabu.page.views) { nabu.page.views = {} };

nabu.page.views.FormComponentGenerator = function(name) {
	return Vue.component(name, {
		template: "#" + name,
		props: {
			page: {
				type: Object,
				required: true
			},
			cell: {
				type: Object,
				required: true
			},
			childComponents: {
				type: Object,
				required: false
			},
			formComponent: {
				type: String,
				required: false,
				default: "page-form-input-text"
			},
			configurationComponent: {
				type: String,
				required: false,
				default: "page-form-input-text-configure"
			},
			edit: {
				type: Boolean
			},
			subTabs: {
				type: Array
			}
		},
		computed: {
			// not reactively updated it seems?
			pageInstance: function() {
				return this.$services.page.getPageInstance(this.page, this);
			},
			computedValue: function() {
				var instance = this.pageInstance;
				return this.cell.state.useComputed && this.cell.state.computed ? this.$services.page.eval(this.cell.state.computed, {}, this) : null;
			},
			placeholder: function() {
				if (this.editable) {
					// if we are translating, show the "raw" untranslated value as placeholder
					if (this.language && this.cell.state.translatable && this.translationArrayPath) {
						var instance = this.pageInstance;
						var original = instance && this.cell.state.name ? instance.get('page.' + this.cell.state.name) : null;
						if (original != null) {
							return original;
						}
					}
					return this.$services.page.interpret(this.$services.page.translate(this.cell.state.placeholder), this)	;
				}
				else {
					return this.$services.page.interpret(this.$services.page.translate(this.cell.state.defaultValue), this);
				}
			},
			value: function() {
				var instance = this.pageInstance;
				// if we have a language AND we are translatable, look up the translated value
				if (this.language && this.cell.state.translatable && this.translationArrayPath) {
					var self = this;
					var array = instance.get(self.translationArrayPath);
					if (array != null) {
						var name = this.cell.state.name.replace(/.*?\.([^.]+)$/, "$1");
						var current = array.filter(function(x) {
							return x.name == name && x.language == self.language;
						})[0];
						// if you have set a specific translation, use that
						if (current) {
							return current.translation;
						}
					}
					return null;
				}
				return instance && this.cell.state.name ? instance.get('page.' + this.cell.state.name) : null;
			},
			parentValue: function() {
				var instance = this.pageInstance;
				return instance ? instance.variables : null;
			},
			disabled: function() {
				// if you have switched to a particular language but this field is not translatable, disable it
				if (this.language != null && !this.cell.state.translatable) {
					return true;
				}
				if (this.running) {
					return true;
				}
				var pageInstance = this.pageInstance;
				if (!pageInstance) {
					 return true;
				}
				var state = this.$services.page.getPageState(pageInstance);
				return !!this.cell.state.disabled && this.$services.page.isCondition(this.cell.state.disabled, state, this, null, true);
			},
			readOnly: function() {
				// originally it was modelled as a boolean, we retain this for backwards compatibility until it is phased out
				if (this.cell.state.readOnly) {
					return true;
				}
				// if you have configured a read only condition on the component, it wins over state
				if (this.cell.state.readOnlyCondition) {
					var pageInstance = this.pageInstance;
					if (!pageInstance) {
						 return true;
					}
					var state = this.$services.page.getPageState(pageInstance);
					return this.$services.page.isCondition(this.cell.state.readOnlyCondition, state, this, null, true);
				}
				// check state
				var stateName = "readOnly";
				// the default should be good enough in almost all cases, but we could add a way to set a different one for more complex usecases
				if (this.cell.state.customReadOnlyState) {
					stateName = this.cell.state.customReadOnlyState;
				}
				if (this.getCurrentStates().indexOf(stateName) >= 0) {
					return true;
				}
				
				// otherwise, we check if there is a parent form with the setting
				// @2025-04-18: if we are in a repeat, we need to get the full content to see if there is a form
				var path = this.pageInstance && this.pageInstance.fragmentParent
					? this.$services.page.getTargetPath(this.pageInstance.fragmentParent.page.content, this.cell.id, true)
					: this.$services.page.getTargetPath(this.page.content, this.cell.id, true);
				if (path) {
					var self = this;
					var readOnly = null;
					path.forEach(function(element) {
						if (element.renderer == "form" && element.form) {
							if (element.runtimeAlias && self.pageInstance) {
								readOnly = self.pageInstance.get("page." + element.runtimeAlias + ".readOnly");
							}
							if (readOnly == null && element.form.readOnly) {
								readOnly = true;
							}
						}
					});
					if (readOnly) {
						return readOnly;
					}
				}
				return false;
			}
		},
		watch: {
			value: function() {
				// first hit is for computation
				if (!this.computed) {
					this.computed = true;
				}
				// array values don't pass via the usual "update", instead they manipulate the arrays directly
				else if (this.value instanceof Array) {
					this.notifyUpdate(this.value, this.value);
				}
			},
			readOnly: function(newValue) {
				this.editable = !newValue;
			}
		},
		created: function() {
			this.initializeArray();
			// if we have a raw value capture, we want to unset it when rendering this component
			// it can only be validly set by the component after it receives the actual value (if any)
			if (this.cell.state.rawName) {
				this.getPageInstance().set("page." + this.cell.state.rawName, null);
			}
			// initialize
			this.editable = !this.readOnly;
			this.calculateInitialLanguage();
		},
		// for some reason enumeration (and all derivatives of enumeration) did not get destroyed correctly
		// if you remove the alias for example for form-text, the destroy is called correctly at all levels
		// same for all other tested form components (date, checkbox,...)
		// but with enumeration, the inner page-form-enumeration destroy was correctly called, but the outer destroy in this component was NOT called
		// this left a remaining instance of the component registered in the page at position 0, which made editing impossible until you fully destroyed and recreated the page
		// after various tests it is entirely unclear why the destroy does not correctly cascade in the case of enumerations so we subscribe to that destroy and cascade it here if relevant
		ready: function() {
			var self = this;
			this.$refs.input.$on("hook:beforeDestroy", function() {
				self.$destroy();
			});
		},
		data: function() {
			return {
				running: false,
				editable: true,
				computed: false,
				language: null,
				// the language array path
				translationArrayPath: null
			}
		},
		methods: {
			calculateInitialLanguage: function() {
				var path = this.pageInstance && this.pageInstance.fragmentParent
					? this.$services.page.getTargetPath(this.pageInstance.fragmentParent.page.content, this.cell.id, true)
					: this.$services.page.getTargetPath(this.page.content, this.cell.id, true);
				if (path) {
					var self = this;
					var language = null;
					path.forEach(function(element) {
						if (element.renderer == "form" && element.form) {
							if (element.runtimeAlias && self.pageInstance) {
								language = self.pageInstance.get("page." + element.runtimeAlias + ".language");
								self.translationArrayPath = "page." + element.runtimeAlias + ".translations";
							}
						}
					});
					if (language != null) {
						this.language = language;
					}
				}
			},
			getPrettyName: function(target) {
				if (target.state) {
					var potential = target.state.label ? target.state.label : target.state.placeholder;
					if (potential != null) {
						var content = potential.trim();
						// if the content is a pure variable (e.g. for basic table layouts), we don't want the curlies
						if (content.substring(0, 1) == "{") {
							content = content.substring(1);
						}
						if (content.substring(content.length - 1) == "}") {
							content = content.substring(0, content.length - 1);
						}
						// if we don't have spaces, we camel case it (e.g. in the variable example)
						content = this.$services.page.prettify(content);
						return content;
					}
				}
			},
			initializeArray: function() {
				// if we don't have a value yet and it is an array, initialize as empty array
				if (this.value == null) {
					if (this.cell.state.initializeArray && this.isArrayField()) {
						this.computed = false;
						this.update([]);
					}
					/*
					var arrays = this.$services.page.getAllArrays(this.page, this);
					if (arrays.indexOf(this.cell.state.name) >= 0 || arrays.indexOf("page." + this.cell.state.name) >= 0) {
						this.computed = false;
						this.update([]);
					}
					*/
				}
			},
			isArrayField: function() {
				var arrays = this.$services.page.getAllArrays(this.page, this);
				if (this.cell.state.name && (arrays.indexOf(this.cell.state.name) >= 0 || arrays.indexOf("page." + this.cell.state.name) >= 0)) {   
					return true;
				}
				return false;
			},
			getTriggers: function() {
				return {
					"update": {
						
					},
					"blur": {
						
					}
				}	
			},
			getAvailableSubTabs: function() {
				var tabs = ["component"];
				if (this.subTabs) {
					nabu.utils.arrays.merge(tabs, this.subTabs);
				}
				tabs.push("form");
				tabs.push("validation");
				return tabs;
				//return this.subTabs == null || this.subTabs.length == 0 ? ["component"] : this.subTabs;
			},
			getEvents: function() {
				return this.$services.triggerable.getEvents(this.page, this.cell.state);
			},
			isRequired: function() {
				if (this.cell.state.required == "condition") {
					return this.$services.page.isCondition(this.cell.state.requiredCondition, {}, this);
				}
				else {
					return this.cell.state.required;
				}
			},
			getChildComponents: function() {
				var result = [];
				if (this.$refs.input && this.$refs.input.getChildComponents) {
					nabu.utils.arrays.merge(result, this.$refs.input.getChildComponents());
				}
				if (result.length == 0) {
					result.push({
						title: "Form Component",
						name: "form-component",
						component: "form-component"
					});
				}
				return result;
			},
			configurator: function() {
				return "nabu-form-component-configuration";	
			},
			getPageInstance: function() {
				var instance =  this.$services.page.getPageInstance(this.page, this);
				//console.log("resolving cell state", this.cell.state.name, instance, instance.get("page." + this.cell.state.name));
				return instance;	
			},
			isDisabled: function() {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(this.page, this);
				var state = self.$services.page.getPageState(pageInstance);
				return !!this.cell.state.disabled && this.$services.page.isCondition(this.cell.state.disabled, state, this);
			},
			getSchema: function() {
				if (!this.edit && this.schemaResolved) {
					return this.schema;
				}
				if (!this.cell.state.name) {
					return null;
				}
				var recursiveGet = function(schema, parts, index) {
					if (schema.items) {
						schema = schema.items;
					}
					var properties = schema.properties;
					if (properties && properties[parts[index]]) {
						if (index < parts.length - 1) {
							return recursiveGet(properties[parts[index]], parts, index + 1);
						}
						else {
							var result = properties[parts[index]];
							result.required = result.required || schema.required && schema.required.indexOf(parts[index]) >= 0;
							return result;
						}
					}
				}
				var definition = this.$services.page.getPageParameters(this.page);
				var parts = this.cell.state.name.split(".");
				var result = definition ? recursiveGet(definition, parts, 0) : null;
				if (!this.edit) {
					this.schema = result;
					// make sure we know its resolved, even if it's null
					this.schemaResolved = true;
				}
				return result;
			},
			availableFields: function(value) {
				var fields = [];
				// @2025-08-19: should this be replaced with getAllAvailableParameters?
				// currently things like events are not listed so you can't modify them
				var parameters = this.$services.page.getPageParameters(this.page);
				nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(parameters, true, true));
				//console.log("fields are", fields);
				fields.sort();
				if (value) {
					fields = fields.filter(function(x) {
						return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
					});
				}
				return fields;
			},
			updateLabel: function(label) {
				this.getPageInstance().setLabel("page." + this.cell.state.name, label);
			},
			update: function(value, label, rawValue) {
				if (this.cell.state.name) {
					var pageInstance = this.getPageInstance();
					var changed = false;
					// if we have a language toggled, we need different behavior
					if (this.language != null) {
						// only do something if we are translatable
						if (this.cell.state.translatable && this.translationArrayPath) {
							var self = this;
							var array = pageInstance.get(self.translationArrayPath);
							if (array == null) {
								array = [];
								pageInstance.set(self.translationArrayPath, array);
							}
							var name = this.cell.state.name.replace(/.*?\.([^.]+)$/, "$1");
							var current = array.filter(function(x) {
								return x.name == name && x.language == self.language;
							})[0];
							if (current == null) {
								// only add if we actually have a translation
								if (value != null) {
									current = {
										name: name,
										language: self.language,
										translation: null
									}
									array.push(current);
								}
							}
							changed = current.translation != value;
							current.translation = value;
						}
					}
					else {
						changed = value !== pageInstance.get("page." + this.cell.state.name);
						pageInstance.set("page." + this.cell.state.name, value, label);
						if (this.cell.state.rawName) {
							pageInstance.set("page." + this.cell.state.rawName, rawValue != null ? rawValue : value, label);
						}
					}
					// we only want to trigger updates if it actually changed
					// we've had cases where combo elements embedded in a repeat triggered the update of the repeat because the combo does an initial emit for labels etc
					// this may be too restrictive on the other hand because the raw value is not known at that point
					// but the raw value was wrongly mapped at the time of writing, making me assume we haven't really used it much
					if (changed) {
						this.notifyUpdate(value, label, rawValue);
					}
				}
				// computed fields do not have a name but are interested in the updates!
				else {
					this.notifyUpdate(value, label, rawValue);
				}
			},
			notifyUpdate: function(value, label, rawValue) {
				var self = this;
				var triggers = [];
				// Deprecated!
				if (self.cell.state.triggers) {
					nabu.utils.arrays.merge(triggers, self.cell.state.triggers);
				}
				// general cell triggers
				if (self.cell.triggers) {
					nabu.utils.arrays.merge(triggers, self.cell.triggers);
				}
				// because going this route actually disables the component while it is performing the update, it will remove focus
				// if used in combination with say a text field, you probably want to set a timeout on the text field
				if (triggers.length > 0) {
					if (self.cell.state.lockDuringTrigger) {
						this.running = true;
					}
					var done = function() {
						self.running = false;
					};
					// because the value might not have existed before, we need to give vue time to propagate the vue.set to everywhere
					// we had a race condition where often the update would trigger a form submit that would in turn trigger a validate
					// this validate failed because from that components perspective, the value had not yet arrived
					// if we incrementally increased a timeout to allow for propagation, the amount of failures went down
					Vue.nextTick(function() {
						// even waiting for the next tick is not enough to guarantee availability of data, but breaking out of that seems to do the trick...
						setTimeout(function() {
							self.$services.triggerable.trigger({triggers:triggers}, "update", {value:value, rawValue: rawValue}, self).then(done, done);
							// emit it so parent components (like repeat) can take action
							// we don't want to use the standard "input" to avoid accidental conflicts
							self.$emit("update", value, label, self.cell.state.name);
						}, 1);
					})
				}
				// when combined with triggers, it waits until the triggers are done
				// without triggers, we emit immediately
				else {
					self.$emit("update", value, label, self.cell.state.name);
				}
			},
			validate: function () {
				if (this.$refs && this.$refs.input) {
					return this.$refs.input.validate();
				}
			},
			blur: function() {
				if (this.cell.state.validateOnBlur) {
					this.validate();
				}
				this.$services.triggerable.trigger({triggers:this.cell.triggers}, "blur", {}, this);
			}
		}
	})
};

nabu.page.views.FormComponent = nabu.page.views.FormComponentGenerator("nabu-form-component");
nabu.page.views.FormComponentGenerator("nabu-form-component-configuration");




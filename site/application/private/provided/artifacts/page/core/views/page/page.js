if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }
if (!nabu.page.mixins) { nabu.page.mixins = {} }

Vue.component("shortkey", {
	template: "#page-shortkey",
	props: {
		ctrl: {
			type: Boolean,
			default: false
		},
		alt: {
			type: Boolean,
			default: false
		}
	}
});

// on created, we want to inject the state of the page into this component so we can access all the data
Vue.mixin({
	props: {
		localState: {
			type: Object,
			required: false
		},
		pageInstanceId: {
			type: Number,
			required: false
		}
	},
	data: function() {
		return {
//			state: {},
			runtimeId: null
		}
	},
	// not ideal, can it be replaced everywhere liwith $services.page.getBindingValue() ?
/*	beforeMount: function() {
		var self = this;
		// map any local state

		if (this.localState) {
			Object.keys(this.localState).map(function(key) {
				Vue.set(self.state, key, self.localState[key]);
			});
		}
		if (this.page) {
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// when creating the actual page, we do not have an instance yet!
			// nor is it important...
			if (pageInstance) {
				Object.keys(pageInstance.variables).map(function(key) {
					if (typeof(self.state[key]) == "undefined") {
						Vue.set(self.state, key, pageInstance.variables[key]);
					}
				})
				var page = this.$services.page.getPageParameterValues(this.page, pageInstance);
				if (Object.keys(page).length) {
					Vue.set(self.state, "page", page);
				}
			}
			var application = {};
			if (this.$services.page.title) {
				application.title = this.$services.page.title;
			}
			this.$services.page.properties.map(function(x) {
				if (x) {
					application[x.key] = x.value;
				}
			});
			Vue.set(self.state, "application", application);
		}
	},*/
	computed: {
		$self: function() {
			return this;
		}	
	},
	beforeDestroy: function() {
		var target = this.$$target;
		if (!target) {
			target = this.$$cell;
		}
		if (target && target.triggers) {
			// untrigger everything when we get destroyed!
			this.$services.triggerable.untrigger(target, null, this);
		}
		if (target && target.state && target.state.triggers) {
			this.$services.triggerable.untrigger(target.state, null, this);
		}
	},
	methods: {
		// your component may be in a state, that state may (or may not) be inherited
		// for instance if you collapse a menu, we add a state "collapsed" to all the components within so they can adjust their styling
		// those states are targeted by adding adding styling wth the original name of the component and ":state" after it, for example "page-button:collapsed"
		getPotentialStates: function() {
			return this.$parent ? this.$parent.getPotentialStates() : [];
		},
		// the actually applied states
		// how they are applied is component specific
		getCurrentStates: function() {
			return this.$parent ? this.$parent.getCurrentStates() : [];
		},
		// expects a prop with name "childComponents"
		getChildComponentClasses: function(name) {
			var classes = [];
			if (this.childComponents && this.childComponents[name] && this.childComponents[name].classes) {
				nabu.utils.arrays.merge(classes, this.childComponents[name].classes);
			}
			var self = this;
			this.getCurrentStates().forEach(function(state) {
				// not used yet but if we want to add "dynamic" styling in the frontend for different states, it could look like this
				var stateName = name + "--" + state;
				if (self.childComponents && self.childComponents[stateName] && self.childComponents[stateName].classes) {
					nabu.utils.arrays.merge(classes, self.childComponents[stateName].classes);
				}
				
				// inject the state as a modifier
				// it currently collides with modifiers but this is (currently) intentional
				// this allows you to write a state as both an implicitly applied state or a modifier that can also be toggled
				// if this proves to be annoying we can update aris generation and page builder at the same time without breaking anything
				// if it does work we could prevent accidental naming collisions between modifiers and states by always targeting the variant of the modifier much like with states:
				// .is-table:where(.is-full-width)
				classes.push("is-" + state);
			});
			return classes;
		},
		// recalculate events on the page instance (if applicable)
		$updateEvents: function() {
			if (this.page) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				if (pageInstance) {
					pageInstance.resetEvents();
				}
			}
		},
		// check if the component is in a certain state
		$is: function(state) {
			return this.getCurrentStates().indexOf(state) >= 0;	
		},
		$value: function(path, literal) {
			if (!literal) {
				literal = application && application.configuration && 
					(application.configuration.interpretValues == null || application.configuration.interpretValues == false);
			}
			var result = null;
			if (this.page) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				result = this.$services.page.getBindingValue(pageInstance, path);
			}
			else {
				if (path.indexOf("application.") == 0) {
					var property = this.$services.page.properties.filter(function(x) {
						return x.key == path.substring("application.".length);
					})[0];
					result = property ? property.value : null;
				}
			}
			return literal ? result : this.$services.page.parseValue(result);
		}
	}
});

nabu.page.mixins.renderer = {
	created: function() {
		var pageInstance = this.$services.page.getPageInstance(this.page, this);
		pageInstance.mountRenderer(this.target, this);
	}	
};

// methods in cell instances:
// - configure: start configuration for the cell content
// - getEvents: return event definitions
// - getLocalState: return the state definition for this level (e.g. because of for loop or variable scoping)
nabu.page.views.Page = Vue.component("n-page", {
	template: "#nabu-page",
	props: {
		// especially for page fragments, we can link a parent page
		// in a lot of cases, the fragment page needs the parent page for some additional resolving (e.g. state, components...)
		fragmentParent: {
			type: Object,
			required: false
		},
		page: {
			type: Object,
			required: true
		},
		parameters: {
			type: Object,
			required: false,
			default: function() { return {} }
		},
		embedded: {
			type: Boolean,
			required: false
		},
		editable: {
			type: Boolean,
			required: false
		},
		masked: {
			typed: Boolean,
			required: false
		},
		stopRerender: {
			type: Boolean,
			required: false,
			default: false
		},
		pageInstanceId: {
			required: false,
			default: function() {
				return application.services.page.pageCounter++;
			}
		},
		recordIndex: {
			type: Number
		},
		// a custom setter used to set values
		$setValue: {
			type: Function,
			required: false
		}
	},
	activate: function(done) {
		// the page has a path, set it in the body so we can do additional stuff
		// in the beginning we set this in the ready hook, however if you have a slow loading page it would only get set after the slow thingy ended
		// however in the mean time your (presumably synchronous) skeletons have already loaded and perhaps even showing a nice loading icon but on the "old" background styling
		if (this.page.content.path)	{
			document.body.setAttribute("page", this.page.name);
			document.body.setAttribute("category", this.page.content.category);
			document.body.setAttribute("page-type", this.page.content.pageType ? this.page.content.pageType : "page");
		}
		
		var self = this;
		var finalize = function() {
			self.oldTitle = document.title;
			document.title = self.$services.page.templateTitle(self.page);
			// we now do this on the ready hook, assuming any async data is available
			/*
			if (self.page.content.branding) {
				// don't copy it by reference, it will be updated...
				self.oldBranding = nabu.utils.objects.deepClone(self.$services.page.currentBranding);
				self.$services.page.updateBranding(self.page.content.branding);
			}
			*/
			if (self.page.content.autoRefresh) {
				self.autoRefreshTimeout = setTimeout(function() {
					if (!self.edit && !self.$services.page.wantEdit) {
						var target = nabu.utils.router.self(self.$el);
						//window.history.go(0);
						self.$services.router.route(self.$services.page.alias(self.page), self.parameters, target);
					}
				}, parseInt(self.page.content.autoRefresh));
			}
			self.initializeDefaultParameters();
			if (self.page.content.initialEvents) {
				self.page.content.initialEvents.forEach(function(x) {
					self.fireInitialEvent(x);
				});
			}
			if (self.page.content.parameters) {
				self.page.content.parameters.forEach(function(parameter) {
					if (parameter.name != null && parameter.defaults && parameter.defaults.length) {
						parameter.defaults.forEach(function(defaultValue) {
							if (defaultValue.query && defaultValue.value) {
								var currentValue = self.$services.page.getValue(self.variables[parameter.name], defaultValue.query);
								if (currentValue == null) {
									if (self.variables[parameter.name] == null) {
										Vue.set(self.variables, parameter.name, {});
									}
									var result = self.$services.page.parseValue(self.$services.page.translate(self.$services.page.interpret(defaultValue.value, self)));               
									self.$services.page.setValue(self.variables[parameter.name], defaultValue.query, result);
								}
							}
						});
					}	
				});
			}
		
			self.registerStateListeners();
			done();
		};
		if (this.page.content.states.length) {
			var sendStateEvent = function(state) {
				if (nabu.page.event.getName(state, "updateEvent")) {
					self.emit(
						nabu.page.event.getName(state, "updateEvent"),
						nabu.page.event.getInstance(state, "updateEvent", self.page, self)
					);
				}
			}
			// inherit the state from the application
			this.page.content.states.filter(function(state) { return !!state.name && state.inherited }).forEach(function(state) {
				// clone it so they don't have the same references! otherwise the array merges might be weird (splice and merge on same array...)
				Vue.set(self.variables, state.name, nabu.utils.objects.clone(self.$services.page.variables[state.applicationName]));
				// you want to send out the event if _anyone_ updates it, not just you
				self.$watch("$services.page.variables." + state.applicationName, function(newValue) {
					// update local variable as well, otherwise changes won't be seen
					if (self.variables[state.name]) {
						self.$services.page.mergeObject(self.variables[state.name], newValue); // self.$services.page.variables[state.applicationName]
					}
					// first set?
					else {
						Vue.set(self.variables, state.name, newValue);
					}
					sendStateEvent(state);
				}, {deep:false});
			});
			this.page.content.states.filter(function(state) { return !!state.name && !state.inherited && state.enableParameterWatching }).forEach(function(state) {
				var timeout = null;
				Object.keys(state.bindings).map(function(key) {
					var binding = state.bindings[key];
					if (binding && binding.indexOf("parent.") != 0) {
						if (binding.indexOf("page.") == 0) {
							binding = binding.substring("page.".length);
						}
						self.$watch("variables." + binding, function() {
							if (timeout != null) {
								clearTimeout(timeout);
								timeout = null;
							}
							// allow some time to stabilize in case of multiple changes or multiple triggers
							timeout = setTimeout(function() {
								self.loadInitialState(state, true);
							}, 100);
						});
					}
				});
			});
			
			// first we make empty promises! that way we can let state interdepend on one another and resolve eventually
			var promiseMap = {};
			this.page.content.states.filter(function(state) { 
				// it must have a name and not be inherited
				return !!state.name && !state.inherited
					&& (!state.condition || self.$services.page.isCondition(state.condition, self.variables, self));
			}).forEach(function(state) {
				promiseMap[state.name] = self.$services.q.defer();	
			});
			var promises = this.page.content.states.filter(function(state) { 
				// it must have a name and not be inherited
				return !!state.name && !state.inherited
					&& (!state.condition || self.$services.page.isCondition(state.condition, self.variables, self));
			}).map(function(state) {
				var promise = promiseMap[state.name];
				
				// we have dependencies on other promises before we can resolve
				// for instance you might want to chain rest invokes
				var promisesToWaitFor = [];
				Object.keys(state.bindings).map(function(key) {
					//parameters[key] = self.get(state.bindings[key]);
					if (state.bindings[key] != null) {
						// if we have a dependency to page-related information at this point, we may need to wait for promises
						if (state.bindings[key].indexOf("page.") == 0) {
							Object.keys(promiseMap).forEach(function(promiseKey) {
								if (state.bindings[key].indexOf("page." + promiseKey + ".") == 0) {
									promisesToWaitFor.push(promiseMap[promiseKey]);
								}
							});
						}
					}
				});
				self.$services.q.all(promisesToWaitFor).then(function() {
					var parameters = {};
					Object.keys(state.bindings).map(function(key) {
						//parameters[key] = self.get(state.bindings[key]);
						if (state.bindings[key] != null) {
							parameters[key] = self.$services.page.getBindingValue(self, state.bindings[key]);
						}
					});
					if (!parameters["$serviceContext"]) {
						parameters["$serviceContext"] = self.getServiceContext();
					}
					try {
						// @2023-12-19: not sure why this is a separate codebase for initializing the states rather than using the central one
						// but the code differs a lot so currently i'm not updating this bit, I did add the trigger for the initial which was not getting run correctly
						// can throw hard errors
						self.$services.swagger.execute(state.operation, parameters).then(function(result) {
							if (result != null) {
								self.initialStateLoaded.push(state.name);
							}
							Vue.set(self.variables, state.name, result ? result : null);
							promise.resolve(result);
							// the triggerInitial is a boolean we might add if we want to trigger on initial load as well
							self.$services.triggerable.trigger(state, "initial", null, self).then(promise, promise);
						}, promise);
					}
					catch (exception) {
						console.error("Could not execute", state.operation, exception);
						promise.reject(exception);
					}
				}, promise);
				return promise;
			});
			var inSelf = this.page.content.errorInSelf;
			var routeError = function(error, counter) {
				if (!counter) {
					counter = 1;
				}
				if (!self.$el && counter < 5 && inSelf) {
					Vue.nextTick(function() {
						routeError(error, counter + 1);
					});
				}
				else {
					console.log("error is", error);
					var route = "error";
					
					// if we have an array, check all responses
					// if at least one response indicates an offline server, we are going with the offline story!
					if (error instanceof Array) {
						error.forEach(function(x) {
							if (x && (x.status == 503 || x.status == 502)) {
								route = "offline";
							}
						})
					}
					else if (error && (error.status == 503 || error.status == 502)) {
						route = "offline";
					}
					
					// if we have not opted for offline behavior, check if we have custom error routing
					if (route == "error" && error.forEach) {
						error.forEach(function(x) {
							// sometimes x is null?
							if (x && x.code && self.page.content.stateErrors) {
								self.page.content.stateErrors.forEach(function(y) {
									if (y.code == x.code) {
										route = y.route;
									}
								});
							}
						});
					}
					
					console.log("error route is", route);
					
					if (!self.$services.page.canEdit()) {
						// masked route so we can reload
						self.$services.router.route(route, {
							code: "page-load-failed",
							message: "%{error::The page you requested could not be loaded, please&nbsp;<a class='is-color-link' href='javascript:void(0)' @click='$window.location.reload()'>try again</a>}"
						}, inSelf && self.$el ? nabu.utils.router.self(self.$el) : null, true);
					}
					else {
						self.$services.notifier.push({
							message: "Blocking error routing to '" + route + "' due to editor permissions",
							severity: self.$services.page.notificationStyle
						});
					}
				}
			};
			this.$services.q.all(promises).then(finalize, function(error) {
				// if we are in edit mode, we can be expected to fix this
				if (self.edit || self.$services.page.wantEdit) {
					finalize();
				}
				else {
					done();
					routeError(error, 0);
				}
			});
		}
		else {
			finalize();
		}
	},
	beforeDestroy: function() {
		if (!this.page.content.readOnly) {
			this.stopEdit();
		}
		if (this.autoRefreshTimeout) {
			clearTimeout(this.autoRefreshTimeout);
			this.autoRefreshTimeout = null;
		}
		if (this.oldTitle) {
			document.title = this.oldTitle;
		}
		if (this.oldBranding) {
			this.$services.page.updateBranding(this.oldBranding);
		}
		this.timers.forEach(function(x) {
			clearTimeout(x);
		});
		if (this.oldBodyClasses.length) {
			document.body.classList.remove.apply(document.body.classList, this.oldBodyClasses.splice(0));
		}
	},
	ready: function() {
		this.$services.page.rendering--;
		this.rendered = true;
		this.postRender.splice(0).forEach(function(x) { x() });
		this.emit("$load", {});
		this.$emit("ready", this);
		var self = this;
		if (self.page.content.branding) {
			// don't copy it by reference, it will be updated...
			self.oldBranding = nabu.utils.objects.deepClone(self.$services.page.currentBranding);
			self.$services.page.updateBranding(self.page.content.branding, this);
		}
	},
	created: function() {
		// we want to be able to push data to the page
		// was added for the repeat, but actually broke stuff in the repeat if we passed in all the information so we did it another way
		// this may still be interesting for future purposes, but probably want to do a reactive set via Vue.set
//		nabu.utils.objects.merge(this.variables, this.parameters);
		this.$services.page.rendering++;
		this.$services.page.setPageInstance(this.page, this);
		var self = this;
		// it could be possible that you use a parameter here (with default) in your initial state
		this.initializeDefaultParameters(true);
		if (this.editable) {
			this.edit = true;
		}
		
		if (!this.embedded) {
			// initialize plugins
			this.plugins.forEach(function(plugin) {
				var component = Vue.component(plugin.component);
				new component({propsData: {
					page: self.page,
					edit: self.edit,
					instance: self
				}});
			});
		}
		
		// set the initial state...
		// stuff that should be hidden, is hidden by default
		// for events, it was enough to detect the event, but with the new generic closeable, we need to specifically set this
		// it should continue to work for events as well though
		this.$services.page.listCloseableItems(this.page, null, true).forEach(function(x) {
			if (!x.startVisible) {
				Vue.set(self.closed, x.id, x.on ? x.on : "$any");
			}
			// if there is an auto timeout, register a watcher
			if (x.showTimeout) {
				self.$watch("closed." + x.id, function(newValue) {
					if (!self.showTimeouts) {
						self.showTimeouts = {};
					}
					if (self.showTimeouts[x.id]) {
						clearTimeout(self.showTimeouts[x.id]);
						delete self.showTimeouts[x.id];
					}
					// if we are showing, register a closer
					if (newValue == null) {
						self.showTimeouts[x.id] = setTimeout(function() {
							Vue.set(self.closed, x.id, x.on ? x.on : "$any");
						}, parseInt(x.showTimeout));
					}
				});
			}
		});
	},
	beforeMount: function() {
		this.$services.page.setPageInstance(this.page, this);
		// keep a stringified copy of the last parameters so we can diff
		// no longer needed? @2021-06-10: it seems this was only for the initial rerender
		// which has long since been deprecated
		//this.lastParameters = JSON.stringify(this.parameters);
		this.$emit("beforeMount", this);
	},
	destroyed: function() {
		this.$services.page.destroyPageInstance(this.page, this);
	},
	computed: {
		events: function() {
			return this.getEvents();
		},
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, null, true);
			// there are all the events
			//var available = nabu.utils.objects.clone(this.getEvents());
			// and the page
			//available.page = this.$services.page.getPageParameters(this.page);
			//return available;
		},
		// we inject this into the tpl only to make it reactive
		// the ultimate goal is to switch classes on the body
		bodyClasses: function () {
			if (this.page.content.bodyStyles && this.page.content.bodyStyles.length) {
				var self = this;
				return this.$services.page.getDynamicClasses(this.page.content.bodyStyles, self.variables, this);
			}
			else {
				return [];
			}
		},
		classes: function() {
			var classes = [];
			if (this.edit) {
				classes.push("is-editing");
				if (this.$services.page.activeViews.length) {
					classes.push("is-active-view");	
				}
				this.$services.page.activeViews.forEach(function(view) {
					classes.push("is-active-view-" + view);
				});
			}
			if (this.page.content.class) {
				classes.push(this.page.content.class);
			}
			if (this.page.content.styles && this.page.content.styles.length) {
				var self = this;
				var dynamics = this.$services.page.getDynamicClasses(this.page.content.styles, self.variables, this);
				nabu.utils.arrays.merge(classes, dynamics);
			}
			if (this.page.content.pageType) {
				classes.push("page-type-" + this.page.content.pageType);
			}
			else {
				classes.push("page-type-page");
			}
			classes.push("is-page-" + this.page.name);
			return classes;
		},
		plugins: function() {
			return nabu.page.providers("page-plugin").filter(function(x) { return x.target == "page" });
		}
	},
	data: function() {
		return {
			// whether or not to collapse the menu
			collapsedMenu: false,
			// you can have active views that enrich information, usually only one is active
			activeViews: ["main"],
			selectedItemPath: [],
			autoRefreshTimeout: null,
			refs: {},
			edit: false,
			// contains all the component instances
			// the key is their id
			components: {},
			// counts upwards for each instance in this page
			// this allows us to differentiate between repeated cells
			instanceCounter: 0,
			// contains (amongst other things) the event instances
			variables: {},
			// labels for values (if relevant)
			labels: {},
			// components can add their own variables
			// each component can have its own name and structure
			//lastParameters: null,
			configuring: false,
			// per cell
			closed: {},
			// centralized storage that exists for the lifetime of the page
			storage: {},
			// subscriptions to events
			subscriptions: {},
			autoMapFrom: null,
			
			// a lot of components load events at the beginning on startup in a computed property
			// however, depending on the mount order, new events come in after those components are started
			// to be able to recompute those events, this should be reactive
			cachedEvents: null,
			// a timer for content saving, we want to batch content updates to prevent a lot of calls
			// the form sets value by value using standard interfaces, it doesn't know that the content is being pushed to the backend
			// we want to keep it that way, which is why it is unaware of the batch
			saveContentTimer: null,
			// the actual contents to save
			saveContents: [],
			savePageTimer: null,
			// the selected item in the side menu
			selectedItem: null,
			// either "cell" or "row"
			selectedType: null,
			// for backwards compatibility we map the selected item to the cell or row it embodies
			cell: null,
			row: null,
			viewComponents: false,
			closing: false,
			saved: null,
			// any timers that might exist and need to be destroyed
			timers: [],
			// actions to run post render (if any)
			postRender: [],
			// whether or not we are ready to go
			rendered: false,
			oldBodyClasses: [],
			initialStateLoaded: [],
			activeTab: "layout",
			// anything waiting for a mount
			waitingForMount: {},
			// in most cases we write conditions on cells to hide themselves or show themselves
			// however, in some cases only the content IN a cell can determine whether it should be shown or not, but this can only be deduced AFTER it is rendered
			// we use the v-show toggle to do that
			hidden: {}
		}
	},
	methods: {
		addTargetState: function(cell) {
			if (!cell.states) {
				Vue.set(cell, "states", []);
			}
			cell.states.push({
				name: null,
				condition: null
			});
		},
		// check if it is an array field or a singular field
		// useful for example for dynamic form elements that can handle both
		isArrayField: function(field) {
			var arrays = this.$services.page.getAllArrays(this.page);
			if (arrays.indexOf(field) >= 0 || arrays.indexOf("page." + field) >= 0) {
				return true;
			}
			else {
				return false;
			}
		},
		getActions: function(target, pageInstance, $services) {
			var actions = [];
			// external variables can always be refreshed
			var hasRefreshableState = this.page.content.states && this.page.content.states.length;
			// internal variables only when they contain a calculation
			if (!hasRefreshableState) {
				if (this.page.content.parameters) {
					hasRefreshableState = this.page.content.parameters.filter(function(x) {
						return x.default || x.defaultScript;
					}).length > 0;
				}
			}
			if (hasRefreshableState) {
				actions.push({
					title: "Refresh State",
					name: "refresh-state",
					description: "Configure the name of the variable that needs to be refreshed",
					input: {
						name: {
							type: "string"
						}
					},
					output: {
					}
				});
			}
			return actions;
		},
		runAction: function(action, parameters) {
			var self = this;
			if (action == "refresh-state" && parameters && parameters.name) {
				if (self.page.content.states) {
					var state = self.page.content.states.filter(function(state) {
						return state.name == parameters.name
					})[0];
					if (state) {
						self.loadInitialState(state, true);
					}
				}
				if (self.page.content.parameters) {
					// currently you can only refresh the default value of a private parameter
					// private parameters are not passed in as a parameter so they should be recalculatable if they have a default script
					// public parameters can be passed in which is currently not compatible with recalculation of default values
					var parameter = self.page.content.parameters.filter(function(parameter) {
						return parameter.name == parameters.name && (parameter.default || parameter.defaultScript) && parameter.private;
					})[0];
					if (parameter) {
						this.loadParameterState(parameter.name, true);
					}
				}
			}
		},
		isActiveView: function(view) {
			return this.$services.page.activeViews.indexOf(view) >= 0;
		},
		acivateView: function(view) {
			this.activeViews.splice(0);
			this.activeViews.push(view);
		},
		updateEvent: function(value, label, name) {
			this.$emit("update", value, label, name);
			/*
			var parent = this.$parent;
			while (parent) {
				if (parent.updateEvent) {
					parent.updateEvent(value, label, name);
				}
				parent = parent.$parent;
			}
			*/
		},
		registerStateListeners: function() {
			var watchers = {};
			var self = this;
			if (this.page.content.parameters) {
				this.page.content.parameters.forEach(function(state) {
					if ((state.triggers && state.triggers.length) || state.store || state.emitUpdate) {
						if (state.name) {
							if (!watchers[state.name]) {
								watchers[state.name] = [];
								self.$watch("variables." + state.name, function() {
									watchers[state.name].forEach(function(listener) {
										listener();
									});
								}, {deep:true})
							}
							if (state.triggers && state.triggers.length) {
								watchers[state.name].push(function() {
									self.$services.triggerable.trigger(state, "change", {}, self);
								});
							}
							if (state.store) {
								watchers[state.name].push(function() {
									// make sure the value is persisted
									setTimeout(function() {
										var value = self.variables[state.name];
										if (value != null) {
											value = JSON.stringify(value);
										}
										var serviceContext = self.getServiceContext();
										localStorage.setItem(self.page.content.name + (serviceContext ? "-" + serviceContext : "") + "-state-" + state.name, value);
									}, 1);
								});
							}
							if (state.emitUpdate) {
								// always send out an update?
								watchers[state.name].push(function() {
									setTimeout(function() {
										self.updateEvent(self.variables[state.name], self.labels[state.name], state.name);
									}, 1);
								})
							}
						}
					}
				});
			}
		},
		getServiceContext: function() {
			if (this.fragmentParent) {
				return this.fragmentParent.getServiceContext();
			}
			if (!this.page.content.useFixedServiceContext && this.page.content.serviceContext) {
				return this.get(this.page.content.serviceContext);
			}
			else if (this.page.content.useFixedServiceContext && this.page.content.fixedServiceContext) {
				return this.page.content.fixedServiceContext;
			}
			return null;
		},
		updateTemplates: function() {
			var self = this;
			this.$confirm({
				message: "Are you sure you want to update all templates?"
			}).then(function() {
				self.$services.page.updateToLatestTemplate(self.page.content, true);
			})
		},
		isContentHidden: function(target) {
			if (this.hidden[target.id] == null) {
				Vue.set(this.hidden, target.id, false);
			}
			return this.hidden[target.id];
		},
		// slots can only be accessed in the direct parent, this means we have a renderer that has specific slots
		getSlots: function(target) {
			var path = this.$services.page.getTargetPath(this.page.content, target.id);
			path.reverse();
			// the first entry is now the target itself, we want the second
			if (path.length >= 2) {
				if (path[1].renderer) {
					var renderer = this.$services.page.getRenderer(path[1].renderer);
					if (renderer.getSlots) {
						return renderer.getSlots(path[1]);
					}
				}
			}
		},
		getParentConfig: function(target) {
			var path = this.$services.page.getTargetPath(this.page.content, target.id);
			path.reverse();
			// the first entry is now the target itself, we want from there onwards
			for (var i = 1; i < path.length; i++) {
				if (path[i].renderer) {
					var renderer = this.$services.page.getRenderer(path[i].renderer);
					if (renderer.getChildConfig) {
						var config = renderer.getChildConfig(path[i], target, path);
						if (config) {
							return config;
						}
					}
				}
			}
		},
		getDefaultTriggers: function() {
			return {
				click: {
					properties: {
						shift: {
							type: "boolean"
						},
						ctrl: {
							type: "boolean"
						},
						alt: {
							type: "boolean"
						},
						meta: {
							type: "boolean"
						}
					}
				},
				hover: {
					properties: {
						// nothing (yet?)
					}
				}
			};
		},
		// this works, but currently we can't get the events correctly
		getTriggersForCell: function(cell) {
			var component = this.components[cell.id];
			// could be because of repeats etc
			if (component instanceof Array) {
				component = component[0];
			}
			// always have a click trigger
			var result = this.getDefaultTriggers();
			var actions = [];
			if (component) {
				// only works for component based actions
				var componentActions = this.$services.page.getActions(component, cell, this);
				if (componentActions) {
					nabu.utils.arrays.merge(actions, componentActions);
				}
				if (component.getTriggers) {
					var componentTriggers = component.getTriggers(cell, this, this.$services);
					if (componentTriggers) {
						nabu.utils.objects.merge(result, componentTriggers);
					}
				}
			}
			// this works for renderer based
			if (cell.renderer) {
				var renderer = this.$services.page.getRenderer(cell.renderer);
				var rendererActions = this.$services.page.getActions(renderer, cell, this);
				if (rendererActions) {
					nabu.utils.arrays.merge(actions, rendererActions);
				}
				if (renderer.getTriggers) {
					var rendererTriggers = renderer.getTriggers(cell, this, this.$services);
					if (rendererTriggers) {
						nabu.utils.objects.merge(result, rendererTriggers);
					}
				}
			}
			if (actions.length > 0) {
				var self = this;
				actions.forEach(function(x) {
					var actionInput = self.$services.page.getActionInput(self, cell.id, x.name);
					var actionOutput = self.$services.page.getActionOutput(self, cell.id, x.name);
					result[x.name + ":before"] = actionInput ? actionInput : {};
					result[x.name + ":after"] = actionOutput ? actionOutput : {};
					result[x.name + ":error"] = {};
				});
			}
			return result;
		},
		getPageArisComponents: function() {
			return [{
				title: "Page Grid",
				name: "page-grid",
				component: "grid"
			}]	
		},
		getGridClasses: function() {
			var classes = [];
			if (this.$services.page.useAris && this.page.content.aris && this.page.content.aris.components) {
				var children = this.$services.page.calculateArisComponents(this.page.content.aris, null, this);
				if (children["page-grid"] && children["page-grid"].classes) {
					nabu.utils.arrays.merge(classes, children["page-grid"].classes);
				}
			}
			return classes;
		},
		// we want to listen for a component, this could be a renderer or a target component
		// it is based on the id
		// it might already be available or it might be mounted at a later point in time
		// either way we return a promise to be consistent
		getComponent: function(id) {
			var promise = this.$services.q.defer();
			// great, resolve it immediately
			if (this.components[id]) {
				promise.resolve(this.components[id]);
			}
			else {
				if (!this.waitingForMount.hasOwnProperty(id)) {
					Vue.set(this.waitingForMount, id, []);	
				}
				this.waitingForMount[id].push(promise);
			}
			return promise;
		},
		addNotification: function() {
			if (!this.page.content.notifications) {
				Vue.set(this.page.content, "notifications", []);
			}	
			this.page.content.notifications.push({
				name: null,
				duration: null,
				// the event you will trigger on
				on: null,
				condition: null,
				title: null,
				message: null,
				severity: null,
				closeable: null,
				icon: null,
				actions: [],
				chainEvent: {
					name: "enrich"
				}
			});
		},
		moveTriggerUp: function(action) {
			var index = this.page.content.actions.indexOf(action);
			if (index > 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.splice(index - 1, 0, action);
			}
		},
		moveTriggerDown: function(action) {
			var index = this.page.content.actions.indexOf(action);
			// not the last one
			if (index < this.page.content.actions.length - 1) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.splice(index + 1, 0, action);
			}
		},
		moveInternalUp: function(parameter) {
			var index = this.page.content.parameters.indexOf(parameter);
			if (index > 0) {
				this.page.content.parameters.splice(index, 1);
				this.page.content.parameters.splice(index - 1, 0, parameter);
			}
		},
		moveInternalDown: function(parameter) {
			var index = this.page.content.parameters.indexOf(parameter);
			// not the last one
			if (index < this.page.content.parameters.length - 1) {
				this.page.content.parameters.splice(index, 1);
				this.page.content.parameters.splice(index + 1, 0, parameter);
			}
		},
		getOperationArrays: function(operation) {
			if (operation) {
				var op = this.$services.swagger.operations[operation];
				if (op && op.responses["200"] != null && op.responses["200"].schema != null) {
					var schema = op.responses["200"].schema;
					if (schema["$ref"]) {
						var definition = this.$services.swagger.resolve(schema["$ref"]);
						return this.$services.page.getArrays(definition);
					}
				}
			}
			return [];
		},
		moveActionTop: function(action) {
			var index = this.page.content.actions.indexOf(action);	
			if (index > 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.unshift(action);
			}
		},
		getHideMode: function(cell) {
			// not yet defined (backwards compatible)
			if (!cell.state || !cell.state.hasOwnProperty("hideMode")) {
				var mode = null;
				if (cell.on) {
					mode = "event";
				}
				else if (cell.condition) {
					mode = "script";
				}
				else if (cell.devices && cell.devices.length) {
					mode = "device";
				}
				else if (cell.closeable) {
					mode = "toggle";
				}
				if (!cell.state) {
					Vue.set(cell, "state", {});
				}
				Vue.set(cell.state, "hideMode", mode);
			}
			return cell.state.hideMode;
		},
		setHideMode: function(cell, mode) {
			Vue.set(cell.state, "hideMode", mode);
			// set some other states to be backwards compatible and keep the future ability to combine multiple conditions
			Vue.set(cell, "closeable", mode == "toggle");
			if (cell.state.mode != "event") {
				cell.on = null;
			}
			if (cell.state.mode != "script") {
				cell.condition = null;
			}
			if (cell.state.mode != "devices" && cell.devices) {
				cell.devices.splice(0);
			}
		},
		moveActionBottom: function(action) {
			var index = this.page.content.actions.indexOf(action);	
			if (index >= 0) {
				this.page.content.actions.splice(index, 1);
				this.page.content.actions.push(action);
			}
		},
		moveAction: function(action, amount) {
			var index = this.page.content.actions.indexOf(action);	
			if (index >= 0) {
				var targetIndex = index + amount;
				if (targetIndex >= 0 && targetIndex <= this.page.content.actions.length - 1) {
					var targetItem = this.page.content.actions[targetIndex];
					this.page.content.actions.splice(targetIndex, 1, this.page.content.actions[index]);
					this.page.content.actions.splice(index, 1, targetItem);
				}
			}
		},
		route: function(alias, parameters, anchor, mask) {
			var self = this;
			var doIt = function() {
				self.$services.router.route(alias, parameters, anchor, mask);
			};
			if (this.rendered) {
				return doIt();
			}
			else {
				this.postRender.push(doIt);
			}
		},
		fireInitialEvent: function(x) {
			var self = this;
			if (nabu.page.event.getName(x, "definition") && (!x.condition || self.$services.page.isCondition(x.condition, self.$services.page.getPageState(self), self))) {           
				try {
					self.emit(
						nabu.page.event.getName(x, "definition"),
						nabu.page.event.getInstance(x, "definition", self.page, self)
					);
				}
				catch (exception) {
					console.error("Could not fire initial event", exception);
				}
			}
			if (x.timeout) {
				var timer = setTimeout(function() {
					// remove this timer
					var index = self.timers.indexOf(timer);
					if (index >= 0) {
						self.timers.splice(index, 1);
					}
					self.fireInitialEvent(x);
				}, parseInt(x.timeout));
				self.timers.push(timer);
			}
		},
		initializeDefaultParameters: function(isInitial, names, force) {
			var self = this;
			if (this.page.content.parameters) {
				this.page.content.parameters.map(function(x) {
					if (x.name != null && (!names || names.indexOf(x.name) >= 0)) {
						// it is entirely possible that someone already set the state for this variable, for example through an initial state with the same name
						// this "trick" is applied when you want to load initial state _and_ you want to modify it through listeners etc
						// we then make two variables with the same name
						// however, if the initial state in this case does not exist, you do want your default to kick in
						// but not if the state already exists
						// if we force it however (e.g. through reset), we do want to recompute every time
						if (self.initialStateLoaded.indexOf(x.name) < 0 || force) {
							// if it is not passed in as input, we set the default value
							if (self.parameters[x.name] == null) {
								var value = null;
								// check if we have local storage
								if (x.store) {
									value = localStorage.getItem(self.page.content.name + "-" + self.getServiceContext() + "-state-" + x.name);
									if (value != null) {
										value = JSON.parse(value);
									}
								}
								// check if we have a content setting
								//if (value == null) {
								//	value = self.$services.page.getContent(x.global ? null : self.page.name, x.name);
								//}
								if (value == null) {
									if (x.complexDefault) {
										value = self.calculateVariable(x.defaultScript);
									}
									else {
										value = self.$services.page.interpret(x.default, self);
									}
								}
								//else {
								//	value = value.content;
								//}
								// inherit from global state (especially interesting for mails/pdfs...)
								// basically you inject state in a global parameters application.state and it will be auto-bound
								if (value == null && application.state && application.state[x.name] != null) {
									value = application.state[x.name];
								}
								if (value != null || isInitial) {
									Vue.set(self.variables, x.name, value == null ? null : value);
								}
							}
							// but you can override the default with an input parameter (only during created, not activate)
							else if (isInitial) {
								Vue.set(self.variables, x.name, self.parameters[x.name]);
							}
						}
					}
				});
			}
		},
		selectTarget: function(target) {
			if (target.cells) {
				this.selectItem(target, null, "row");
			}
			else if (target.rows) {
				var path = this.$services.page.getTargetPath(this.page.content, target.id);
				this.selectItem(path[path.length - 2], target, "cell");
			}
		},
		selectItem: function(row, cell, type, tab) {
			Vue.set(this, 'row', row);
			Vue.set(this, 'cell', cell);
			Vue.set(this, 'selectedType', type);
			
			if (tab) {
				this.activeTab = tab ? tab : "selected";
			}

			// if we set something, calculate a new path
			if (type) {
				var path = this.$services.page.getTargetPath(this.page.content, this.selectedType == "cell" ? this.cell.id : this.row.id);
				var samePath = false;
				// if our current path is shorter than the one we already have selected (so basically we selected a parent)
				// we keep the longer path! this allows you to switch to a parent and then back to the child you were working on
				if (path.length < this.selectedItemPath.length) {
					samePath = true;
					var self = this;
					path.forEach(function(x, index) {
						if (samePath && self.selectedItemPath[index].id != x.id) {
							samePath = false;
						}
					});
				}
				if (!samePath) {
					this.selectedItemPath.splice(0);
					nabu.utils.arrays.merge(this.selectedItemPath, path);
				}
			}
			
			var component = this.canConfigureInline(cell);
			this.$services.page.availableSubTabs.splice(0);
			if (component) {
				if (component.getAvailableSubTabs) {
					nabu.utils.arrays.merge(this.$services.page.availableSubTabs, component.getAvailableSubTabs());
				}
			}
			var availableTabs = ["container", "styling", "triggers", "analysis"];
			
			if (this.$services.page.availableSubTabs.length) {
				nabu.utils.arrays.merge(availableTabs, this.$services.page.availableSubTabs);
			}
			else if (cell) {
				availableTabs.push("component");
			}
			else {
				availableTabs.push("container");
			}
			// whatever tab we had is no longer valid, reset it
			if (availableTabs.indexOf(this.$services.page.activeSubTab) < 0) {
				this.$services.page.activeSubTab = availableTabs[0];
			}
		},
		stopEdit: function() {
			if (this.edit && !this.closing) {
				this.closing = true;
				//var right = document.querySelector("#n-sidebar-right-instance");
				var right = document.querySelector(".is-sidebar.right");
				if (right && right.__vue__ && right.__vue__.close) {
					right.__vue__.close();
				}
				else if (right && right.$$close) {
					right.$$close();
				}
				//var left = document.querySelector("#n-sidebar-left-instance");
				var left = document.querySelector(".is-sidebar.left");
				if (left && left.__vue__ && left.__vue__.close) {
					left.__vue__.close();
				}
				else if (left && left.$$close) {
					left.$$close();
				}
				/*if (this.$refs.sidemenu) {
					this.$refs.sidemenu.close();
				}*/
				if (this.$services.page.editing) {
					this.$services.page.editing.edit = false;
					this.$services.page.editing = null;
				}
				this.closing = false;
				this.edit = false;
				document.querySelectorAll(".is-hovering").forEach(function(element) {
					element.classList.remove("is-hovering", "is-hover-top", "is-hover-bottom", "is-hover-left", "is-hover-right");
				});
				document.body.removeAttribute("page-editing");
			}
		},
		goIntoEdit: function() {
			if (!this.edit) {
				// normalize
				if (!this.page.content.formatters) {
					Vue.set(this.page.content, "formatters", []);
				}
				if (this.$services.page.editing) {
					if (this.$services.page.editing.edit) {
						this.$services.page.editing.stopEdit();
					}
					this.$services.page.editing = null;
				}
				this.edit = true;
				this.$services.page.editing = this;
				// automatically pop up the new components window
				this.viewComponents = true;
			}	
		},
		addInitialEvent: function() {
			if (!this.page.content.initialEvents) {
				Vue.set(this.page.content, "initialEvents", []);
			}
			this.page.content.initialEvents.push({condition:null, definition: {}});
		},
		listFields: function(type, value) {
			// added try/catch in case the type is unknown
			try {
				var type = this.$services.swagger.resolve(type);
				return this.$services.page.getSimpleKeysFor(type).filter(function(x) { return !value || (x && x.toLowerCase().indexOf(value.toLowerCase()) >= 0) });
			}
			catch (exception) {
				console.warn("Could not list fields for", type, exception);
				return [];
			}
		},
		validateStateName: function(name) {
			var blacklisted = ["page", "application", "record", "state", "localState"];
			var messages = [];
			if (name && blacklisted.indexOf(name) >= 0) {
				messages.push({
					type: "error",
					title: "%{This name is not allowed}"
				});
			}
			return messages;
		},
		isGet: function(operationId) {
			var operation = this.$services.swagger.operations[operationId];
			return operation && operation.method && operation.method.toLowerCase() == "get";
		},
		getParameterTypes: function(value) {
			var types = ['string', 'boolean', 'number', 'integer'];
			nabu.utils.arrays.merge(types, Object.keys(this.$services.swagger.swagger.definitions));
			if (value) {
				types = types.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return types;
		},
		store: function(key, value) {
			if (typeof(value) == "object") {
				if (!this.storage[key]) {
					Vue.set(this.storage, key, {});
				}
				Object.keys(value).map(function(name) {
					Vue.set(this.storage[key], name, value[name]);
				})
			}
			else {
				Vue.set(this.storage, key, value);
			}
		},
		retrieve: function(key) {
			return this.storage[key];
		},
		automap: function(action) {
			var source = this.availableParameters[this.autoMapFrom];
			var self = this;
			var keys = self.$services.page.getSimpleKeysFor(source);
			this.getOperationParameters(action.operation, true).map(function(key) {
				// only automap those that are not filled in
				if (!action.bindings[key]) {
					var keyToCheck = key.indexOf(".") < 0 ? key : key.substring(key.indexOf(".") + 1);
					//if (!!source.properties[keyToCheck]) {
					var matching = keys.filter(function(x) { return x == keyToCheck || (x.length > keyToCheck.length + 1 && x.substring(x.length - (keyToCheck.length + 1)) == "." + keyToCheck) });
					if (matching.length > 0) {
						Vue.set(action.bindings, key, self.autoMapFrom + "." + matching[0]);
					}
				}
			});
		},
		pasteRow: function(cell) {
			if (cell) {
				cell.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
				this.$services.page.copiedRow = null;
			}
			// pushing to page!
			else {
				this.page.content.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
				this.$services.page.copiedRow = null;
			}
		},
		getStateOperations: function(value) {
			return this.$services.page.getStateOperations(value);
		},
		setStateOperation: function(state, operation) {
			state.operation = operation;
			var bindings = {};
			if (operation) {
				this.$services.swagger.operations[operation].parameters.map(function(parameter) {
					bindings[parameter.name] = null;
				});
			}
			Vue.set(state, "bindings", bindings);
		},
		addState: function() {
			this.page.content.states.push({
				name: null,
				operation: null,
				bindings: {},
				condition: null
			})	
		},
		addApplicationState: function() {
			this.page.content.states.push({
				inherited: true,
				name: null,
				// the name of the state at the application level
				applicationName: null
			});
		},
		dragMenu: function(event) {
			this.$services.page.setDragData(event, "page-menu", this.page.name);
		},
		// apparently you can't (in chrome at least) access the data during drag
		// this is to prevent inspecting data that is accidently dragged over your website
		// we _can_ however access the list of data types that is available
		dragOver: function(event) {
			if (this.$services.page.hasDragData(event, "page-menu")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "component-alias")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "template-content")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "operation")) {
				event.preventDefault();
			}
		},
		dropMenu: function(event) {
			var self = this;
			if (this.$services.page.getDragData(event, "page-menu")) {
				var rect = this.$el.getBoundingClientRect();
				Vue.set(this.page.content, "menuX", event.clientX - rect.left);
				Vue.set(this.page.content, "menuY", event.clientY - rect.top);
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "component-alias")) {
				var row = this.addRow(this.page.content);
				var cell = this.addCell(row);
				cell.alias = this.$services.page.getDragData(event, "component-alias");
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "template-content")) {
				var content = JSON.parse(this.$services.page.getDragData(event, "template-content"));
				// row drop from templates
				if (content.type == "page-row") {
					if (!self.page.content.rows) {
						Vue.set(self.page.content, "rows", []);
					}
					if (content.content instanceof Array) {
						content.content.forEach(function(row) {
							self.page.content.rows.push(self.$services.page.renumber(self.page, self.$services.page.normalizeRow(row)));
						});
					}
					else {
						self.page.content.rows.push(self.$services.page.renumber(self.page, self.$services.page.normalizeRow(content.content)));
					}
				}
				else {
					if (content.rows instanceof Array) {
						var rows = content.rows.map(function(x) {
							return self.$services.page.renumber(self.page, x);	
						});
						nabu.utils.arrays.merge(this.page.content.rows, rows);
					}
					if (content.actions instanceof Array) {
						nabu.utils.arrays.merge(this.page.content.actions, content.actions);
					}
				}
				event.preventDefault();
				event.stopPropagation();
			}
			if (this.$services.page.getDragData(event, "operation")) {
				this.initializeOperation(function(target) {
					return self.addRow(target ? target : self.page.content);
				}, function(row) {
					return self.addCell(row);
				});
				event.preventDefault();
				event.stopPropagation();
			}
		},
		initializeOperation: function(rowGenerator, cellGenerator) {
			var self = this;
			var content = this.$services.page.getDragData(event, "operation");
			if (content) {
				if (this.$services.swagger.operations[content]) {
					this.initializeOperationInternal(rowGenerator, cellGenerator, content);
				}
				// if we can't find the operation, reload the swagger and try again
				// if it's still not there, we fail
				else {
					this.$services.page.reloadSwagger().then(function() {
						if (self.$services.swagger.operations[content]) {
							self.initializeOperationInternal(rowGenerator, cellGenerator, content);
						}
						else {
							console.error("Can not find operation", content);
						}
					});
				}
			}
		},
		initializeOperationInternal: function(rowGenerator, cellGenerator, content) {
			var self = this;
			var acceptedRoutes = this.$services.router.router.list().filter(function(route) {
				if (route.accept) {
					console.log("found acceptor", route.alias);
				}
				return route.accept && route.accept("operation", content);
			});
			// if we have multiple routes, only choose correctly annotated routes that we can ask the user which he wants
			if (acceptedRoutes.length > 1) {
				acceptedRoutes = acceptedRoutes.filter(function(x) {
					return x.icon && x.name;	
				});
			}
			
			var applicableGenerators = nabu.page.providers("page-generator").filter(function(generator) {
				if (generator.accept) {
					console.log("found generator", generator.name);
				}
				return generator.accept && generator.accept("operation", content);
			});
			// the necessary fields for these two are in sync:
			// - icon
			// - name
			// - description
			// we don't have an alias in generators which is what we use to distinguish between the two
			nabu.utils.arrays.merge(acceptedRoutes, applicableGenerators);

			var runRoute = function(route) {
				var row = rowGenerator();
				var cell = cellGenerator(row);
				cell.alias = route.alias;
				if (route.initialize) {
					cell.$$initialize = function(instance) {
						route.initialize("operation", content, instance, cell, row, self, rowGenerator, cellGenerator);
					}
				}
				event.preventDefault();
				event.stopPropagation();
				self.$services.page.slowNormalizeAris(self.page, row, "row");
				self.$services.page.slowNormalizeAris(self.page, cell);
			};
			console.log("accepted routes are", acceptedRoutes);
			// if there is only one, execute it immediately
			if (acceptedRoutes.length == 1) {
				if (acceptedRoutes[0].alias) {
					runRoute(acceptedRoutes[0]);
				}
				else if (acceptedRoutes[0].initialize) {
					acceptedRoutes[0].initialize("operation", content, self, rowGenerator, cellGenerator);
				}
			}
			// if we have multiple, show a popup
			else if (acceptedRoutes.length > 1) {
				this.$prompt("page-components-selector", {components: acceptedRoutes}).then(function(chosen) {
					if (chosen) {
						if (chosen.alias) {
							runRoute(chosen);
						}
						else if (chosen.initialize) {
							chosen.initialize("operation", content, self, rowGenerator, cellGenerator);
						}
					}	
				});
			}
		},
		save: function(event) {
			if (this.edit) {
				var self = this;
				this.$services.page.update(this.page).then(function() {
					self.saved = new Date();
					self.$services.notifier.push({
						message: "Page '" + self.page.content.name + "' saved!",
						severity: self.$services.page.notificationStyle
					});
				}, function(error) {
					self.$services.notifier.push({
						message: "Could not save page '" + self.page.content.name + "'",
						severity: "danger-outline"
					});
				});
				event.preventDefault();
				event.stopPropagation();
			}
		},
		getOperationParameters: function(operation, explode) {
			// could be an invalid operation?
			if (!this.$services.swagger.operations[operation]) {
				 return [];
			}
			var parameters = this.$services.swagger.operations[operation].parameters;
//			parameters["$serviceContext"] = {
//				type: "string"
//			};
			if (explode) {
				return this.$services.page.getSwaggerParametersAsKeys(this.$services.swagger.operations[operation]);
			}
			else {
				return parameters ? parameters.map(function(x) { return x.name }) : [];
			}
		},
		addEventReset: function(action) {
			if (action.eventResets == null) {
				Vue.set(action, "eventResets", []);
			}
			action.eventResets.push('');
		},
		getOperations: function(value) {
			var options = Object.keys(this.$services.swagger.operations);
			if (value) {
				options = options.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return options;
		},
		getAvailableEvents: function(event) {
			var available = this.getEvents();
			var result = Object.keys(available);
			result = result.filter(function(x) {
				return x != null && typeof(x) == "string";
			});
			if (event) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(event.toLowerCase()) >= 0;
				});
			}
			result.sort();
			return result;
		},
		addAnalysis: function() {
			if (!this.page.content.analysis) {
				Vue.set(this.page.content, "analysis", []);
			}	
			this.page.content.analysis.push({
				name: null,
				on: null,
				condition: null
			});
		},
		addAction: function() {
			this.page.content.actions.push({
				name: null,
				on: null,
				confirmation: null,
				operation: null,
				route: null,
				event: null,
				anchor: null,
				bindings: {},
				expandBindings: true
			});
		},
		removeQuery: function(index) {
			this.page.content.query.splice(index, 1);	
		},
		ref: function(reference) {
			return this.refs[reference];
		},
		// destroy a component from the page
		destroyComponent: function(component, cell) {
			// keep track of the separate instances
			if (this.components["instance_" + component.$$pageInstanceCounter]) {
				Vue.delete(this.components, "instance_" + component.$$pageInstanceCounter, null);
			}
			if (component.getRuntimeAlias) {
				var alias = component.getRuntimeAlias();
				if (alias != null) {
					Vue.delete(this.components, "alias_" + component.getRuntimeAlias(), null);
					// unset the state again so it can be reused
					// or at the very least it is clear that it is gone
					// it should use the custom setter if available
					this.set(component.getRuntimeAlias(), null);
					//Vue.set(this.variables, component.getRuntimeAlias(), null);

					// THIS DOES NOT WORK
					// the problem is that often we set the rendering condition on some far away parent of the component that actually has the state
					// this means we don't "cleanly" destroy it
					// note that mountRenderer() has a beforedestroy hook that is also not correctly called
					// the problem is mostly that they are keyed to the same cell, so they have the same instance
					// because of this reuse, the destroy hooks are not correctly called until it is fully destroyed
					var self = this;
					// reset all he labels belonging to this state
					Object.keys(self.labels).forEach(function(label) {
						if (label == component.getRuntimeAlias() || label.indexOf(component.getRuntimeAlias() + ".") == 0) {
							Vue.set(self.labels, label, null);
						}
					})
				}
			}
			// this keeps track by cell id
			if (this.components[cell.id] != null) {
				if (this.components[cell.id] instanceof Array) {
					var index = this.components[cell.id].indexOf(component);
					if (index >= 0) {
						this.components[cell.id].splice(index, 1);
					}
					if (this.components[cell.id].length == 0) {
						Vue.delete(this.components, cell.id, null);
					}
					// make singular again
					else if (this.components[cell.id].length == 1) {
						this.components[cell.id] = this.components[cell.id][0];
					}
				}
				else if (this.components[cell.id] == component) {
					Vue.delete(this.components, cell.id, null);
				}
			}
		},
		// in the beginning we only kept track of one component per cell id
		// there can not be multiple, it is not entirely clear how this should work for now
		// repeats are turned off in edit mode so shouldn't trigger multiple components, but page-arbitrary can
		// upside: we can offer a solution for configuration of arbitrary, downside: the state etc is still not ok (probably...?)
		getComponentForCell: function(cellId) {
			var result = this.components[cellId];
			if (result instanceof Array) {
				// slightly evil fix, in some rare cases (currently and hopefully only during editing), the destroy routines are not correctly triggered
				// this means we end up picking the "stale" cell that is no longer part of the page
				// instead of taking the first (which was initially the setup), we take the last instance
				return result[result.length - 1];
			}
			return result;
		},
		// can do an explicit renderer mount
		mountRenderer: function(target, component) {
			if (target.renderer && target.runtimeAlias && component.getRuntimeState) {
				var toMerge = null;
				if (target.mergeState) {
					// if there is already state, let's merge it
					if (this.variables[target.runtimeAlias] != null) {
						toMerge = this.variables[target.runtimeAlias];
					}
				}
				//Vue.set(this.variables, target.runtimeAlias, component.getRuntimeState());
				// use potentially localized set
				this.set(target.runtimeAlias, component.getRuntimeState());
				if (!target.retainState) {
				}
				if (toMerge != null) {
					this.$services.page.mergeObject(this.variables[target.runtimeAlias], toMerge);
				}
			}
			// link back for certain functions like beforeDestroy untriggering
			component.$$target = target;
			var self = this;
			// when we exit edit mode, we don't actually destroy the parent page, but we do reroute all the children
			// for whatever reason (possibly because this is asynchronous), it does not play well with the rerendering of the actual children
//			if (!this.edit) {
				component.$on("hook:beforeDestroy", function() {
					// you may have already been replaced! at that point, we assume by an instance of the same thing
					// this usually happens when switching between editing and not editing
					// at that point, the new component should be registered already and we don't want to wipe that out
					if (self.components[target.id] == component) {
						if (target.renderer && target.runtimeAlias && component.getRuntimeState && !target.retainState) {
							//Vue.set(self.variables, target.runtimeAlias, null);
							// use potentially localized set
							self.set(target.runtimeAlias, null);
						}
						if (target.renderer) {
							// only unset if it _is_ you, at some point we were unsetting other instances
							self.components[target.id] = null;	
						}
					}
				});
//			}
			// resolve anyone waiting for this component
			if (this.waitingForMount[target.id] instanceof Array) {
				this.waitingForMount[target.id].forEach(function(x) {
					x.resolve(component);
				});
				Vue.delete(this.waitingForMount, target.id);
			}
			// we set this as the target id, this may conflict with cells?
			if (target.renderer) {
				this.components[target.id] = component;
			}
		},
		mounted: function(cell, row, state, component) {
			var self = this;
			
			if (component.$mounted) {
				self.$services.page.rendering--;
			}
			else {
				component.$on("hook:mounted", function() {
					self.$services.page.rendering--;
				});
			}
			
			component.$on("update", function(value, label, name) {
				if (cell.bindings && cell.bindings[name]) {
					self.set(cell.bindings[name], value, label);
				}
				if (cell.contentRuntimeAlias) {
					self.set(cell.contentRuntimeAlias + "." + name, value, label);
				}
				// @2024-09-27
				// for a while there was only the "emit" line which basically pushes all update statements to the PARENT page (not the parent component of the cell reporting the update)
				// however, combined with the steps above where we _always_ map the data if the conditions apply, this created weird things
				// for instance, we had a nested page which had a contentruntimealias where we automapped the data to another component, but within that nested page we had a form component that triggered an update
				// this update was pushed to the parent page and (because of the content runtime alias) set in the shared object (see getParameters) for that content runtime alias
				// this in turn meant it was part of the parameters which again in turn triggered refreshes which had the potential to unset state
				// the assumption is that "in general" you don't want pages to simply push updates to the parent page at all
				// there is however at least one valid usecase (which is probably the origin of this line): repeats that use fragment pages for partial states
				// there the fragment page does need to report the update to its parent page in order to be able to trigger the "update" in triggers (to have a single update operation trigger instead of having to configure it on every element)
				// so currently I have opted to reduce the emit to only happen if you have a fragment parent (which is only currently used by repeats)
				// if you do want to nest a page and have its content updated, you should use the "emit to parent" to explicitly enable this
				// if there does turn out to be a valid usecase for pushing all updates to the parent page, we should at least limit the setting of the state in the above lines of code to only apply if the cell reporting the update BELONGS to your page
				// otherwise we can have naming conflicts etc appear cross page
				// currently there is no way to cleanly report the source of the original event however, so this would need some additional logic
				if (self.fragmentParent) {				
					self.$emit("update", value, label, name);
				}
				// @2025-03-14
				// when you have form fields in a form, the form "update" was not being triggered
				// so I added this to ensure that it continues...
				else if (component.$parent) {
					component.$parent.$emit("update", value, label, name);
				}
			})
			
			component.$on("close", function() {
				var closed = false;
				if (self.$services.page.isCloseable(cell)) {
					closed = true;
					Vue.set(self.closed, cell.id, cell.on ? cell.on : "$any");
				}
				if (row && self.$services.page.isCloseable(row)) {
					closed = true;
					Vue.set(self.closed, row.id, row.on ? row.on : "$any");
				}
				if (!closed && component.$parent) {
					component.$parent.$emit("close");
				}
			});
			
			// in some cases only the component knows when to hide (e.g. tags)
			// we use the hidden logic to v-show the wrapper cell as well to prevent it taking up empty space that might influence things like css gaps
			if (component.isCellHidden) {
				Vue.set(self.hidden, cell.id, component.isCellHidden());
				// and we listen for updates
				component.$on("hide", function() {
					Vue.set(self.hidden, cell.id, true);	
				});
				component.$on("show", function() {
					Vue.set(self.hidden, cell.id, false);	
				});
			}
			
			// assign a page instance counter for unique temporary reference
			component.$$pageInstanceCounter = this.instanceCounter++;
			this.components["instance_" + component.$$pageInstanceCounter] = component;
			
			// set the cell on the component, we might need to trace it back?
			component.$$cell = cell;
			
			// define an alias
			if (component.getRuntimeAlias) {
				var alias = component.getRuntimeAlias();
				if (alias != null) {
					// not used atm, but could be handy to retrieve a component by its name
					// there might also be a ref that does this? see below cell.ref
					this.components["alias_" + component.getRuntimeAlias()] = component;
					// override the currently empty state with the actual state
					// all modification of that state must occur on this object (by reference)
					if (component.getRuntimeState) {
						Vue.set(this.variables, component.getRuntimeAlias(), component.getRuntimeState());
					}
				}
			}
			// if you were to set a row renderer _and_ a cell renderer, we might not pick it up?
			// the problem with this approach is manyfold:
			// - some renderers _don't_ render children the "normal" way (e.g. repeat), so the mounted() hook of a child is never called, meaning it is never picked up
			// - other renderer can obviously render multiple children (e.g. a form), we don't want to repeatedly register
			/*
			if (cell.renderer && cell.runtimeAlias && component.$parent && component.$parent.getState) {
				Vue.set(this.variables, cell.runtimeAlias, component.$parent.getState());
				if (!cell.retainState) {
					component.$parent.$on("hook:beforeDestroy", function() {
						Vue.set(this.variables, cell.runtimeAlias, null);
					});
				}
			}
			else if (row.renderer && row.runtimeAlias && component.$parent && component.$parent.getState) {
				Vue.set(this.variables, row.runtimeAlias, component.$parent.getState());
				if (!row.retainState) {
					component.$parent.$on("hook:beforeDestroy", function() {
						Vue.set(this.variables, row.runtimeAlias, null);
					});
				}
			}
			*/
			
			// run the initializer function (if any) with the component instance
			if (cell.$$initialize) {
				cell.$$initialize(component);
				cell.$$initialize = null;
			}
			
			if (cell.ref) {
				this.refs[cell.ref] = component;
			}
			
			component.$on("hook:beforeDestroy", function() {
				// clear subscriptions
				if (component.$pageSubscriptions != null) {
					component.$pageSubscriptions.forEach(function(sub) {
						sub();
					});
				}
				if (cell.ref) {
					self.refs[cell.ref] = null;
				}
				// currently all this does is update the components, which is better done here
				//self.$services.page.destroy(component);
				self.destroyComponent(component, cell);
			});
			
			// reset event cache
			this.cachedEvents = null;
			// if it already exists, we have multiple components for the same cell id, this is possible in for example a "for each" scenario
			// or when dealing with arbitrary content that the parent does not have full knowledge about and might register itself
			if (this.components[cell.id] != null) {
				// if not an array yet, we make it an array
				if (!(this.components[cell.id] instanceof Array)) {
					this.components[cell.id] = [this.components[cell.id]];
				}
				this.components[cell.id].push(component);
			}
			else {
				this.components[cell.id] = component;
			}
			
			// we subscribe to a very specific event that will reset all the registered events
			// this is because it is cached...
			component.$on("updatedEvents", function() {
				self.resetEvents();
			});
			
			var self = this;
			
			/*
			// we want to inject all the data into the component so it can be used easily
			var data = {};
			// shallow copy of the variables that exist
			Object.keys(this.variables).map(function(key) {
				data[key] = self.variables[key];
			});
			*/
			
			// actually, the state is not in the parents as rows and cells are not components
			// state is sent in
			/*
			// now we want to walk the parent nodes of the component until we reach the page
			// and check if they have any local state that should be added
			// parents can override page-level properties but because we loop from closest parent to furthest parent, they can not override each others keys
			// as the most specific parent is supposed to win
			var parentKeys = [];
			var parent = component.$parent;
			while (parent) {
				if (parent == this) {
					break;
				}
				if (parent.data) {
					Object.keys(parent.data).map(function(key) {
						if (parentKeys.indexOf(key) < 0) {
							data[key] = parent.data[key];
							parentKeys.push(key);
						}
					})
				}
				parent = parent.$parent;
			}
			*/
			
			/*
			if (state) {
				Object.keys(state).map(function(key) {
					data[key] = state[key];
				})
			}
			*/
			
			// we want to inject all the necessary data into the cell so it can be referenced by components
//			Vue.set(component, "state", data);
		
			// make sure we have a watchable variable for each event
			if (component.getEvents) {
				var self = this;
				var eventResult = component.getEvents();
				if (eventResult) {
					var subscribeToEvent = function(name) {
						if (!self.variables[name]) {
							Vue.set(self.variables, name, null);
						}
						component.$on(name, function(value) {
							self.emit(name, value);
						});
					}
					if (typeof(eventResult) == "string") {
						subscribeToEvent(eventResult);
					}
					else if (eventResult instanceof Array) {
						// TODO: add array support
					}
					else {
						Object.keys(eventResult).map(subscribeToEvent);
					}
				}
			}
			
			// if we have old-timey event registration, use it to pick up page events
			if (component.$options.events) {
				if (component.$pageSubscriptions == null) {	
					component.$pageSubscriptions = [];
				}
				var self = this;
				Object.keys(component.$options.events).forEach(function(name) {
					component.$pageSubscriptions.push(self.subscribe(name, component.$options.events[name].bind(component)));
				});
			}
			
			// resolve anyone waiting for this component
			if (this.waitingForMount[cell.id] instanceof Array) {
				this.waitingForMount[cell.id].forEach(function(x) {
					x.resolve(component);
				});
				Vue.delete(this.waitingForMount, cell.id);
			}
		},
		hasConfigureListener: function(rows) {
			if (!rows) {
				rows = this.page.content.rows;
			}
			if (rows) {
				for (var i = 0; i < rows.length; i++) {
					if (rows[i].on == "$configure") {
						return true;
					}
					if (rows[i].cells) {
						for (var j = 0; j < rows[i].cells.length; j++) {
							var cell = rows[i].cells[j];
							if (cell.on == "$configure") {
								return true;
							}
							if (cell.rows) {
								var has = this.hasConfigureListener(cell.rows);
								if (has) {
									return true;
								}
							}
						}
					}
				}
			}
			return false;
		},
		addCell: function(target, skipInject) {
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: null,
				height: null,
				condition: null,
				devices: [],
				clickEvent: null
			};
			if (!skipInject) {
				target.cells.push(cell);
				this.$services.page.normalizeAris(this.page, cell);
			}
			return cell;
		},
		addRow: function(target, skipInject) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			var row = {
				id: this.page.content.counter++,
				state: {},
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			};
			if (!skipInject) {
				target.rows.push(row);
				this.$services.page.normalizeAris(this.page, row, "row");
			}
			return row;
		},
		addPageParameter: function() {
			if (!this.page.content.parameters) {
				Vue.set(this.page.content, "parameters", []);
			}
			this.page.content.parameters.push({
				name: null,
				type: null,
				format: null,
				default: null,
				global: false,
				// we can listen to events and take a value from them to update the current value
				// e.g. we could update a search parameter if you select something
				listeners: []
			});
		},
		removeRow: function(row) { 
			this.page.content.rows.splice(this.page.content.rows(indexOf(row), 1))
		},
		resetEvents: function() {
			this.cachedEvents = null;
		},
		getDraggables: function() {
			var result = {};
			var self = this;
			Object.keys(this.components).map(function(cellId) {
				var component = self.components[cellId];
				var handle = function(component) {
					// pages will _not_ send their events by default to other pages (only through global events)
					// so this we skip the page components in this listing
					if (component && component.getDraggables && !self.$services.page.isPage(component)) {
						var cellDraggables = component.getDraggables();
						if (cellDraggables) {
							Object.keys(cellDraggables).forEach(function(key) {
								result[key] = cellDraggables[key];
							});
						}
					}
				}
				if (component instanceof Array) {
					component.forEach(handle);
				}
				else {
					handle(component);
				}
			});
			return result;
		},
		getStateEvents: function() {
			return {
				"change": {}
			};
		},
		getEvents: function() {
			// non-watched cache property
			// we have too many problems with update loops that are triggered by this method
			// and in general the result should only change if we route new content
			if (!this.cachedEvents) {
				var events = {
					"$configure": {properties:{}},
					"$clear": {properties:{}},
					"$load": {properties:{}}
				};
				
				var self = this;
				this.cachedEvents = events;
				
				// check which events are picked up globally
				if (this.page.content.globalEventSubscriptions) {
					var globalEventDefinitions = this.$services.page.getGlobalEvents();
					this.page.content.globalEventSubscriptions.map(function(sub) {
						events[sub.localName == null ? sub.globalName : sub.localName] = globalEventDefinitions[sub.globalName] ? globalEventDefinitions[sub.globalName] : {properties:{}};	
					});
				}
				
				// your page actions can trigger success events
				if (this.page.content.actions) {
					this.page.content.actions.filter(function(x) { return x.event != null && x.operation != null }).map(function(action) {
						if (self.$services.swagger.operations[action.operation] == null) {
							console.error("Could not find operation for action", action.operation, action.name, action.event);
						}
						else {
							var response = self.$services.swagger.operations[action.operation].responses["200"];
							var schema = null;
							if (response && response.schema) {
								schema = self.$services.swagger.resolve(response.schema);
							}
							// we only want the array in it
							if (action.singlify) {
								var theParts = action.singlify.split(".");
								for (var i = 0; i < theParts.length; i++) {
									schema = schema.properties[theParts[i]];
								}
								if (schema.items) {
									schema = schema.items;
								}
							}
							events[action.event] = schema ? schema : {};
						}
					});
					this.page.content.actions.filter(function(x) { return x.errorEvent != null && x.operation != null }).map(function(action) {
						events[action.errorEvent] = self.$services.swagger.resolve("#/definitions/StructuredErrorResponse");
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "chainEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "chainEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "chainEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "timeoutEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "timeoutEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "timeoutEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return nabu.page.event.getName(action, "downloadFailedEvent") != null;
					}).forEach(function(action) {
						var type = nabu.page.event.getType(action, "downloadFailedEvent");
						if (type.properties && Object.keys(type.properties).length == 0 && action.on) {
							type = action.on;
						}
						events[nabu.page.event.getName(action, "downloadFailedEvent")] = type;
					});
					this.page.content.actions.filter(function(action) {
						return action.function && action.functionOutputEvent;
					}).forEach(function(action) {
						events[action.functionOutputEvent] = self.$services.page.getFunctionOutputFull(action.function);
					});
				}
				
				nabu.utils.objects.merge(events, this.$services.triggerable.getEvents(this.page, this.page.content));
				
				// add the cell events
				this.page.content.rows.map(function(row) {
					self.getNestedEvents(row, events);
				});
				
				Object.keys(this.components).map(function(cellId) {
					var component = self.components[cellId];
					if (component) {
						var handle = function(component) {
							// pages will _not_ send their events by default to other pages (only through global events)
							// so this we skip the page components in this listing
							if (component && component.getEvents && !self.$services.page.isPage(component)) {
								var cellEvents = component.getEvents();
								if (cellEvents) {
									// if you have no particular content, you can just send the name of the event
									if (typeof(cellEvents) == "string") {
										events[cellEvents] = {};
									}
									else if (cellEvents instanceof Array) {
										// TODO: support arrays of strings and/or objects?
									}
									else {
										Object.keys(cellEvents).map(function(key) {
											events[key] = cellEvents[key];
										});
									}
								}
							}
						}
						if (component instanceof Array) {
							component.forEach(handle);
						}
						else {
							handle(component);
						}
						// get potential trigger target
						var triggerTarget = component.target ? component.target : (component.cell ? component.cell : component.row);
						if (triggerTarget && triggerTarget.triggers) {
							nabu.utils.objects.merge(events, self.$services.triggerable.getEvents(self.page, triggerTarget, component));
						}
					}
				});
				Object.keys(events).map(function(name) {
					// because events can reference one another in circular fashion, we allow for event references
					// this means if the value is a string rather than an array of fields, we assume it is the name of another event and we should use those parameters
					if (typeof(events[name]) == "string") {
						if (events[events[name]]) {
							events[name] = events[events[name]];
						}
						else {
							console.warn("Can not find event: " + events[events[name]]);
							events[name] = {};
						}
					}
				});
				
				if (this.page.content.initialEvents) {
					this.page.content.initialEvents.forEach(function(event) {
						var name = nabu.page.event.getName(event, "definition");
						if (name) {
							events[name] = nabu.page.event.getType(event, "definition");
						}
					});
				}
				
				if (this.page.content.states) {
					this.page.content.states.forEach(function(state) {
						var name = nabu.page.event.getName(state, "updateEvent");
						if (name) {
							events[name] = nabu.page.event.getType(state, "updateEvent");
						}
						if (state.triggers) {
							nabu.utils.objects.merge(events, self.$services.triggerable.getEvents(self.page, state));
						}
					});
				}
			}
			return this.cachedEvents;
		},
		getRendererEvents: function(name, target) {
			var renderer = nabu.page.providers("page-renderer").filter(function(x) { return x.name == name })[0];
			var result = null;
			if (renderer && renderer.getEvents) {
				result = renderer.getEvents(target);
			}
			return result ? result : {};
		},
		getNestedEvents: function(cellContainer, events) {
			if (cellContainer.renderer) {
				nabu.utils.objects.merge(events, this.getRendererEvents(cellContainer.renderer, cellContainer));
			}
			var self = this;
			if (cellContainer.cells) {
				cellContainer.cells.forEach(function(cell) {
					if (cell.renderer) {
						nabu.utils.objects.merge(events, self.getRendererEvents(cell.renderer, cell));
					}
					
					if (nabu.page.event.getName(cell, "clickEvent")) {
						events[nabu.page.event.getName(cell, "clickEvent")] = nabu.page.event.getType(cell, "clickEvent");
					}
					// <DEPRECATED>
					if (cell.clickEvent && typeof(cell.clickEvent) == "string") {
						events[cell.clickEvent] = {
							properties: {
								value: {
									type: "string"
								}
							}
						};
					}
					// </DEPRECATED>
					if (cell.rows) {
						cell.rows.map(function(row) {
							self.getNestedEvents(row, events);
						});
					}
				});
			}
		},
		subscribe: function(event, handler) {
			if (!this.subscriptions[event]) {
				this.subscriptions[event] = [];
			}
			this.subscriptions[event].push(handler);
			var self = this;
			return function() {
				var index = self.subscriptions[event].indexOf(handler);
				if (index >= 0) {
					self.subscriptions[event].splice(index, 1);
				}
			};
		},
		reset: function(name) {
			Vue.delete(this.variables, name);
		},
		calculateVariable: function(script) {
			try {
				return this.$services.page.eval(script, this.variables, this);
			}
			catch (exception) {
				console.warn("Could not execute script", script, exception);
				return null;
			}
		},
		isBinaryDownload: function(operationId) {
			var operation = this.$services.swagger.operations[operationId];
			return operation && operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream";
		},
		emit: function(name, value, reset) {
			this.$services.page.report("emit", this.page.content.name, null, name, value);
			var self = this;

			// used to be a regular assign and that seemed to work as well?
			Vue.set(this.variables, name, value);
			
			var promises = [];
			
			if (!reset) {
				if (this.page.content.analysis) {
					this.page.content.analysis.filter(function(x) { return x.on == name }).map(function(analysis) {
						if (analysis.condition && !self.$services.page.isCondition(analysis.condition, value, self)) {
							return;
						}
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var content = nabu.page.event.getInstance(analysis, "chainEvent", self.page, self);
						self.$services.analysis.push({
							pageName: self.page.content.name,
							pageCategory: self.page.content.category,
							category: "trigger",
							type: "page-analysis",
							event: nabu.page.event.getName(analysis, "chainEvent"),
							// more consistent with the eventing backend
							content: content,
							// DEPRECATED: needed for backwards compatibility
							data: content
						});
					})
				}
				if (this.page.content.notifications) {
					this.page.content.notifications.filter(function(x) { return x.on == name }).map(function(notification) {
						if (notification.condition && !self.$services.page.isCondition(notification.condition, value, self)) {
							return;
						}
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						// we take a copy to enrich it (if necessary)
						var notificationContent = value ? nabu.utils.objects.clone(value) : {}; 
						var content = nabu.page.event.getInstance(notification, "chainEvent", self.page, self);
						if (content) {
							Object.keys(content).forEach(function(key) {
								notificationContent[key] = content[key];	
							});
						}
						// we clone the notification so we can enrich it with the data
						var result = nabu.utils.objects.clone(notification);
						// interpret the results
						Object.keys(result).forEach(function(key) {
							result[key] = self.$services.page.interpret(self.$services.page.translate(result[key]), self, notificationContent);
						});
						result.data = notificationContent;
						self.$services.notifier.push(result);
					})
				}
				// check all the actions to see if we need to run something
				this.page.content.actions.map(function(action) {
					
					if (action.on == name) {
						// if we have a condition, run it
						if (action.condition && !self.$services.page.isCondition(action.condition, value, self)) {
							return;
						}
						
						var promise = self.$services.q.defer();
						
						var runFunction = function() {
							if (action.isSlow) {
								self.$wait({promise: promise});
							}
							var func = self.$services.page.getRunnableFunction(action.function);
							if (!func) {
								throw "Could not find function: " + action.function; 
							}
							var input = {};
							if (action.bindings) {
								var pageInstance = self;
								Object.keys(action.bindings).forEach(function(key) {
									if (action.bindings[key]) {
										var value = self.$services.page.getBindingValue(pageInstance, action.bindings[key], self);
										self.$services.page.setValue(input, key, value);
									}
								});
							}
							var result = self.$services.page.runFunction(func, input, self, promise);
							if (action.functionOutputEvent) {
								var def = self.$services.page.getFunctionDefinition(action.function);
								if (def.async) {
									promise.then(function(asyncResult) {
										self.emit(action.functionOutputEvent, asyncResult ? asyncResult : {});
									});
								}
								else {
									self.emit(action.functionOutputEvent, result ? result : {});
								}
							}
							return result;
						}
						
						var runScript = function() {
							if (action.script) {
								var script = action.script;
								// if we don't wrap it in a function, it might only execute the first line
								// when dealing with formatting or conditions that might be wanted
								// however, in this location we want to execute a full script, we are not assigning or conditioning
								if (script.trim().indexOf("function") != 0) {
									script = "function(){ " + script + "}";
								}
								self.$services.page.eval(script, self.variables, self);
							}
						}
						
						promises.push(promise);
						var parameters = {};
						Object.keys(action.bindings).map(function(key) {
							self.$services.page.setValue(parameters, key, self.$services.page.getBindingValue(self, action.bindings[key]));
						});
						
						var eventReset = function() {
							// if we are emitting a "null" value for the current event, we don't want to trigger the reset listeners!
							if (action.eventResets != null && value != null) {
								action.eventResets.forEach(function(event) {
									self.emit(event, null, true);
								});
							}
						};
						
						var date = new Date();
						var stop = function(error) {
							if (action.name) {
								self.$services.analysis.push({
									pageName: self.page.content.name,
									pageCategory: self.page.content.category,
									category: "trigger",
									type: "page-trigger",
									event: action.name
								});
							}
						};
						
						if (nabu.page.event.getName(action, "chainEvent")) {
							promise.then(function() {
								var pageInstance = self.$services.page.getPageInstance(self.page, self);
								var content = nabu.page.event.getInstance(action, "chainEvent", self.page, self);
								if (Object.keys(content).length == 0) {
									content = value;
								}
								var doIt = function() {
									pageInstance.emit(
										nabu.page.event.getName(action, "chainEvent"),
										content
									);
								}
								if (action.chainTimeout) {
									setTimeout(doIt, parseInt(action.chainTimeout));
								}
								else {
									doIt();
								}
							});
						}
						promise.then(function() { stop() }, function(error) { stop(error) });
						
						var wait = !action.timeout || !nabu.page.event.getName(action, "timeoutEvent") ? null : function() {
							var content = nabu.page.event.getInstance(action, "timeoutEvent", self.page, self);
							if (Object.keys(content).length == 0) {
								content = value;
							}
							self.emit(
								nabu.page.event.getName(action, "timeoutEvent"),
								content
							);
						}
						
						var emitDownloadFailed = function() {
							if (nabu.page.event.getName(action, "downloadFailedEvent")) {
								self.emit(
									nabu.page.event.getName(action, "downloadFailedEvent"),
									nabu.page.event.getInstance(action, "downloadFailedEvent", self.page, self)
								);
							}
						}
						
						if (action.confirmation) {
							self.$confirm({message:self.$services.page.translate(self.$services.page.interpret(action.confirmation, self))}).then(function() {
								if (wait) {
									self.$services.q.wait(promise, parseInt(action.timeout), wait);
								}
								var element = null;
								var async = false;
								// already get the element, it can be triggered with or without a route
								if (action.scroll) {
									var element = document.querySelector(action.scroll);
									if (!element) {
										element = document.getElementById(action.scroll);
									}
								}
								if (action.url) {
									var url = self.$services.page.interpret(action.url, self);
									if (action.anchor == "$blank") {
										window.open(url);
									}
									else {
										window.location = url;
									}
								}
								else if (action.route) {
									var routePromise = null;
									eventReset();
									if (action.anchor == "$blank") {
										window.open(self.$services.router.template(action.route, parameters));
									}
									else if (action.anchor == "$window") {
										window.location = self.$services.router.template(action.route, parameters);
									}
									else {
										routePromise = self.route(action.route, parameters, action.anchor ? action.anchor : null, action.anchor ? true : false);
									}
									if (element) {
										if (routePromise && routePromise.then) {
											routePromise.then(function() {
												element.scrollIntoView();
											});
										}
										else {
											element.scrollIntoView();
										}
									}
								}
								else if (action.scroll) {
									eventReset();
									if (element) {
										element.scrollIntoView();
									}
								}
								else if (action.operation && self.isGet(action.operation) && action.anchor == "$blank") {
									window.open(self.$services.swagger.parameters(action.operation, parameters).url, "_blank");
								}
								else if (action.operation) {
									if (action.isSlow) {
										self.$wait({promise: promise});
									}
									var operation = self.$services.swagger.operations[action.operation];
									// currently we hardcode an exception for this service
									// in the future we should use swagger extensions to mark the id & secret fields for downloads with temporary authentication
									// that way we can support it for more services
									if (operation.operationId == "nabu.cms.attachment.rest.internal.get") {
										this.$services.attachment.download(parameters.nodeId, parameters.attachmentId);
										eventReset();
									}
									else if (operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream") {   
										if (action.anchor != "$window") {
											self.$services.page.download(self.$services.swagger.parameters(action.operation, parameters).url, emitDownloadFailed);
										}
										else {
											window.location = self.$services.swagger.parameters(action.operation, parameters).url;
										}
										eventReset();
									}
									else {
										async = true;
										self.$services.swagger.execute(action.operation, parameters).then(function(result) {
											if (action.singlify) {
												var arr = self.$services.page.getValue(result, action.singlify);
												result = arr && arr.length > 0 ? arr[0] : null;
											}
											if (action.event) {
												// we get null from a 204
												self.emit(action.event, result == null ? {} : result);
											}
											eventReset();
											promise.resolve(result);
										}, function(error) {
											if (action.errorEvent) {
												self.emit(action.errorEvent, error);
											}
											promise.reject(error);
										});
									}
								}
								else if (action.function) {
									runFunction();
								}
								else {
									eventReset();
								}
								runScript();
								if (!async) {
									promise.resolve();
								}
							}, function() {
								promise.reject();
							})
						}
						else {
							if (wait) {
								self.$services.q.wait(promise, parseInt(action.timeout), wait);
							}
							var async = false;
							if (action.url) {
								var url = self.$services.page.interpret(action.url, self);
								if (action.anchor) {
									window.open(url);
								}
								else {
									window.location = url;
								}
							}
							else if (action.scroll) {
								eventReset();
								var element = document.querySelector(action.scroll);
								if (!element) {
									element = document.getElementById(action.scroll);
								}
								if (element) {
									element.scrollIntoView();
								}
							}
							else if (action.route) {
								eventReset();
								if (action.anchor == "$blank") {
									window.open(self.$services.router.template(action.route, parameters));
								}
								else if (action.anchor == "$window") {
									window.location = self.$services.router.template(action.route, parameters);
								}
								else {
									self.route(action.route, parameters, action.anchor ? action.anchor : null, action.anchor ? true : false);
								}
							}
							else if (action.operation && self.isGet(action.operation) && action.anchor == "$blank") {
								window.open(self.$services.swagger.parameters(action.operation, parameters).url, "_blank");
							}
							else if (action.operation) {
								if (action.isSlow) {
									self.$wait({promise: promise});
								}
								var operation = self.$services.swagger.operations[action.operation];
								if (operation.operationId == "nabu.cms.attachment.rest.internal.get") {
									this.$services.attachment.download(parameters.nodeId, parameters.attachmentId);
									eventReset();
								}
								else if (operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream") {
									if (action.anchor != "$window") {
										self.$services.page.download(self.$services.swagger.parameters(action.operation, parameters).url, emitDownloadFailed);
									}
									else {
										window.location = self.$services.swagger.parameters(action.operation, parameters).url;
									}
									eventReset();
								}
								else {
									async = true;
									self.$services.swagger.execute(action.operation, parameters).then(function(result) {
										if (action.singlify) {
											var arr = self.$services.page.getValue(result, action.singlify);
											result = arr && arr.length > 0 ? arr[0] : null;
										}
										if (action.event) {
											// we get null from a 204
											self.emit(action.event, result == null ? {} : result);
										}
										eventReset();
										promise.resolve(result);
									}, function(error) {
										if (action.errorEvent) {
											self.emit(action.errorEvent, error);
										}
										promise.reject(error);
									});
								}
							}
							else if (action.function) {
								runFunction();
							}
							else {
								eventReset();
							}
							runScript();
							if (!async) {
								promise.resolve();
							}
						}
					}
				});
				
				promises.push(this.$services.triggerable.trigger(this.page.content, name, value, this));
			}
			
			if (this.subscriptions[name]) {
				this.subscriptions[name].forEach(function(handler) {
					var result = handler(value);
					if (result && result.then) {
						promises.push(result);
					}
				});
			}
			else if (this.subscriptions["$any"]) {
				this.subscriptions["$any"].forEach(function(handler) {
					var result = handler(name, value);
					if (result && result.then) {
						promises.push(result);
					}
				});
			}
			
			// check states that have to be refreshed
			if (this.page.content.states.length && !reset) {
				var sendStateEvent = function(state) {
					if (nabu.page.event.getName(state, "updateEvent")) {
						self.emit(
							nabu.page.event.getName(state, "updateEvent"),
							nabu.page.event.getInstance(state, "updateEvent", self.page, self)
						);
					}
				}
				nabu.utils.arrays.merge(promises, this.page.content.states.filter(function(x) { 
					return x.refreshOn != null && x.refreshOn.indexOf(name) >= 0
						&& (!x.condition || self.$services.page.isCondition(x.condition, self.variables, self));
				}).map(function(state) {
					// replaced with utility function
					/*
					if (state.inherited) {
						return self.$services.page.reloadState(state.applicationName).then(function(result) {
							//Vue.set(self.variables, state.name, result ? result : null);
							sendStateEvent(state);
						});
					}
					else {
						var parameters = {};
						Object.keys(state.bindings).map(function(key) {
							parameters[key] = self.$services.page.getBindingValue(self, state.bindings[key]);
						});
						if (!parameters["$serviceContext"]) {
							parameters["$serviceContext"] = self.get("page.$serviceContext");
						}
						try {
							// can throw hard errors
							return self.$services.swagger.execute(state.operation, parameters).then(function(result) {
								if (self.variables[state.name] != null) {
									if (self.variables[state.name] instanceof Array) {
										self.variables[state.name].splice(0);
										if (result instanceof Array) {
											nabu.utils.arrays.merge(self.variables[state.name], result);
										}
										else if (result) {
											self.variables[state.name].push(result);
										}
									}
									// can be resetting to null
									else if (!result) {
										Vue.set(self.variables, state.name, null);
									}
									else {
										var resultKeys = Object.keys(result);
										Object.keys(self.variables[state.name]).forEach(function(key) {
											if (resultKeys.indexOf(key) < 0) {
												self.variables[state.name][key] = null;
											}
										});
										// make sure we use vue.set to trigger other reactivity
										resultKeys.forEach(function(key) {
											Vue.set(self.variables[state.name], key, result[key]);
										});
										// TODO: do a proper recursive merge to maintain reactivity with deeply nested
										
										//nabu.utils.objects.merge(self.variables[state.name], result);
									}
								}
								else {
									Vue.set(self.variables, state.name, result ? result : null);
								}
								sendStateEvent(state);
							});
						}
						catch (exception) {
							console.error("Could not execute", state.operation, exception);
							var promise = self.$services.q.defer();
							promise.reject(exception);
							return promise;
						}
					}*/
					return self.loadInitialState(state, true);
				}));
			}
			
			// remove all the closed stuff for this event, we may want to reopen something
			Object.keys(this.closed).map(function(key) {
				if (self.closed[key] == name) {
					Vue.set(self.closed, key, null);
				}
			});
			return this.$services.q.all(promises).then(function() {
				if (self.page.content.globalEvents && !reset) {
					var globalEvent = self.page.content.globalEvents.filter(function(x) {
						return x.localName == name;
					})[0];
					if (globalEvent) {
						self.$services.page.emit(globalEvent.globalName ? globalEvent.globalName : name, value, reset);
					}
				}
			});
		},
		loadState: function(name, initial) {
			var promise = this.$services.q.defer();
			var state = this.page.content.states.filter(function(x) {
				return x.name == name;
			})[0];
			if (state) {
				var result = this.loadInitialState(state, !initial);
				if (result && result.then) {
					result.then(promise, promise);
				}
				else {
					promise.reject();
				}
			}
			else {
				this.loadParameterState(name, !initial);
				promise.resolve();
			}
			return promise;
		},
		loadParameterState: function(parameter, reload) {
			var self = this;
			parameter = self.page.content.parameters.filter(function(x) {
				return x == parameter || x.name == parameter;
			})[0];
			if (parameter) {
				self.initializeDefaultParameters(true, [parameter.name], true);
				/*
				if (reload) {
					if (nabu.page.event.getName(parameter, "updatedEvent")) {
						self.emit(
							nabu.page.event.getName(parameter, "updatedEvent"),
							nabu.page.event.getInstance(parameter, "updatedEvent", self.page, self)
						);
					}
				}
				*/
			}
		},
		loadInitialState: function(state, reload) {
			// you can pass in the full state or the name of a state
			state = this.page.content.states.filter(function(x) {
				return x == state || x.name == state;
			})[0];
			if (state) {
				var self = this;
				var sendStateEvent = function(state) {
					if (nabu.page.event.getName(state, "updateEvent")) {
						self.emit(
							nabu.page.event.getName(state, "updateEvent"),
							nabu.page.event.getInstance(state, "updateEvent", self.page, self)
						);
					}
				}
				if (state.inherited) {
					if (reload) {
						return self.$services.page.reloadState(state.applicationName).then(function(result) {
							//Vue.set(self.variables, state.name, result ? result : null);
							sendStateEvent(state);
						});
					}
				}
				else {
					var parameters = {};
					Object.keys(state.bindings).map(function(key) {
						parameters[key] = self.$services.page.getBindingValue(self, state.bindings[key]);
					});
					if (!parameters["$serviceContext"]) {
						parameters["$serviceContext"] = self.getServiceContext();
					}
					try {
						var promise = self.$services.q.defer();
						// can throw hard errors
						self.$services.swagger.execute(state.operation, parameters).then(function(result) {
							if (self.variables[state.name] != null) {
								if (self.variables[state.name] instanceof Array) {
									self.variables[state.name].splice(0);
									if (result instanceof Array) {
										nabu.utils.arrays.merge(self.variables[state.name], result);
									}
									else if (result) {
										self.variables[state.name].push(result);
									}
								}
								// can be resetting to null
								else if (!result) {
									Vue.set(self.variables, state.name, null);
								}
								else {
									var resultKeys = Object.keys(result);
									Object.keys(self.variables[state.name]).forEach(function(key) {
										if (resultKeys.indexOf(key) < 0) {
											self.variables[state.name][key] = null;
										}
									});
									// make sure we use vue.set to trigger other reactivity
									resultKeys.forEach(function(key) {
										Vue.set(self.variables[state.name], key, result[key]);
									});
									// TODO: do a proper recursive merge to maintain reactivity with deeply nested
									
									//nabu.utils.objects.merge(self.variables[state.name], result);
								}
							}
							else {
								Vue.set(self.variables, state.name, result ? result : null);
							}
							// deprecated
							sendStateEvent(state);
							
							// the triggerInitial is a boolean we might add if we want to trigger on initial load as well
							self.$services.triggerable.trigger(state, reload ? "update" : "initial", null, self).then(promise, promise);
						}, promise);
						return promise;
					}
					catch (exception) {
						console.error("Could not execute", state.operation, exception);
						var promise = self.$services.q.defer();
						promise.reject(exception);
						return promise;
					}
				}
			}
		},
		addGlobalEvent: function() {
			if (!this.page.content.globalEvents) {
				Vue.set(this.page.content, "globalEvents", []);
			}
			this.page.content.globalEvents.push({localName: null, globalName: null});
		},
		addGlobalEventSubscription: function() {
			if (!this.page.content.globalEventSubscriptions) {
				Vue.set(this.page.content, "globalEventSubscriptions", []);
			}
			this.page.content.globalEventSubscriptions.push({localName: null, globalName: null});
		},
		getLabel: function(name) {
			// state can be dynamically inserted and removed without triggering new labels
			// usually when state is manipulated into an actual value, it _does_ go through the proper channels, but specifically state resets are generally not well supported
			// check comments in destroyComponent()
			
			// the workaround is getting the original value. if its null, we assume there is no label value either
			// note that this prevents setting a label for null though...
			// for "default" values that are set when rerendering, this will not work if you have an actual label. most fields don't have labels though
			var value = this.get(name);
			if (value == null) {
				return null;
			}
			return this.$services.page.getValue(this.labels, name);	
		},
		setLabel: function(name, label) {
			this.$services.page.setValue(this.labels, name, label);
		},
		get: function(name) {
			// probably not filled in the value yet
			if (!name) {
				return null;
			}
//			if (this.fragmentParent && (name == "$serviceContext" || name == "page.$serviceContext")) {
//				return this.fragmentParent.get(name);
//			}
			if (name == "page") {
				return this.fragmentParent ? this.fragmentParent.get(name) : this.variables;
			}
			else if (name == "page.$this" || name == "$page" || name == "$this") {
				return this.fragmentParent ? this.fragmentParent.get(name) : this;
			}
			else if (name == "parent.$this" || name == "$parent") {
				var parentInstance = this.page.content.pageParent ? this.$services.page.getPageInstanceByName(this.page.content.pageParent) : null;
				if (parentInstance == null) {
					parentInstance = this.$services.page.getParentInstance(this);
				}
				return parentInstance;
			}
			else if (name == "parent") {
				var parentInstance = this.page.content.pageParent ? this.$services.page.getPageInstanceByName(this.page.content.pageParent) : null;
				if (parentInstance == null) {
					parentInstance = this.$services.page.getParentInstance(this);
				}
				return parentInstance ? parentInstance.variables : null;
			}
			else if (name == "application.title") {
				return this.$services.page.title;
			}
			else if (name.indexOf("application.") == 0) {
				var name = name.substring("application.".length);
				var value = this.$services.page.properties.filter(function(x) {
					return x.key == name;
				})[0];
				if (value == null) {
					value = this.$services.page.environmentProperties.filter(function(x) {
						return x.key == name;
					})[0];
				}
				return value ? value.value : null;
			}
			else if (name.indexOf("parent.") == 0) {
				// TODO: to be verified that this work in a stable way
				// the problem we have is: you want to persist state at for example the skeleton level
				// however, some pages might be nested in other pages (especially page components)
				// they don't need to / want to know the depth at which they are rendered (and this may differ)
				// so instead of going up 1 level, we want to check all levels until we find a match
				// the potential problems can arise if there is a recursive loop possibly in this structure
				var name = name.substring("parent.".length);
				var parentInstance = this.page.content.pageParent ? this.$services.page.getPageInstanceByName(this.page.content.pageParent) : this.$services.page.getParentInstance(this);
				//var result = parentInstance ? parentInstance.get("page." + name) : null;
				var result = parentInstance ? parentInstance.get(name) : null;
				if (result == null && parentInstance) {
					result = parentInstance.get("parent." + name);
					//var parentInstance = this.$services.page.getParentPageInstance(parentInstance ? parentInstance.page : this.page, parentInstance ? parentInstance : this);
					//if (parentInstance) {
					//	result = parentInstance.get("parent." + name);
					//}
				}
				return result;
			}
			else if (name.indexOf("page.") == 0) {
				var name = name.substring("page.".length);
				var dot = name.indexOf(".");
				var localName = dot >= 0 ? name.substring(0, dot) : name;
				var relativeName = dot >= 0 ? name.substring(dot + 1) : null;
				var applicationProperty = this.$services.page.properties.filter(function(property) {
					return property.key == localName;
				})[0];
				var pageParameter = this.page.content.parameters ? this.page.content.parameters.filter(function(parameter) {
					return parameter.name == localName;
				})[0] : null;
				var stateParameter = this.page.content.states ? this.page.content.states.filter(function(state) { return state.name == localName })[0] : null;
				
				var result = null;
				if (applicationProperty) {
					result = applicationProperty.value;
				}
				else if (pageParameter != null) {
					result = this.variables[pageParameter.name];
				}
				else if (stateParameter != null) {
					result = this.variables[stateParameter.name];
				}
				else {
					result = this.parameters ? this.parameters[name] : null;
					// best effort get from local variables
					if (result == null) {
						result = this.variables[localName];
					}
					// cascade to fragment parent BEFORE we do the next bit
					if (result == null && this.fragmentParent) {
						result = this.fragmentParent.get(name);
					}
					// if it exists nowhere else, we will create an entry for it in variables
					// at least then there is SOMETHING to bind to reactively, if we _do_ get the state at a later point in variables, it should be reactive
					if (result == null) {
						if (!this.variables.hasOwnProperty(localName)) {
							Vue.set(this.variables, localName, null);
						}
						result = this.variables[localName];
					}
				}
				if (result != null && relativeName != null) {
					var parts = relativeName.split(".");
					for (var i = 0; i < parts.length; i++) {
						result = result[parts[i]];
						if (result == null) {
							break;
						}
					}
				}
				return result;
			}
			// note: currently this is slightly out of sync with "page." logic
			// the problem is if you simply do get("queryParameter"), it won't work
			// because query paramters are not available in variables
			// solution 1: copy all page parameters to variables (this is likely the best option though it may break reactivity of query parameters?)
			// solution 2: add resolving here to also check the page parameters.
			// workaround: use "page.queryParameter" syntax to resolve (currently used until decision is made) for example by page form components
			// note that set() also suffers from the same problem it seems!
			else {
				
				// let's check if there is a provider for it
				var result = null;
				// check if there is a provider for it
				nabu.page.providers("page-bindings").forEach(function(provider) {
					var provided = provider();
					if (Object.keys(provided.definition).indexOf(parts[0]) >= 0) {
						result = provided.resolve(name.substring(name.indexOf(".") + 1));
					}
				});
				// if we found it through a provider, so be it
				if (result != null) {
					return result;
				}
				
				// at this point, it _has_ to be in variables
				// note that (like above with page.) if there is a value missing we want an empty value in variables so it is at least responsive if we do eventually get the value
				
				var parts = name.split(".");
				if (!this.variables.hasOwnProperty(parts[0])) {
					Vue.set(this.variables, parts[0], null);
				}
				result = this.variables[parts[0]];
				
				// we want a whole variable
				if (result == null || parts.length == 1 || (parts.length == 2 && parts[1] == "$all")) {
					return result;
				}
				
				var value = this.variables[parts[0]];
				for (var i = 1; i < parts.length; i++) {
					if (value) {
						if (value instanceof Array) {
							value = value.map(function(x) { return x[parts[i]] });
						}
						else {
							value = value[parts[i]];
						}
					}
				}
				return value;
			}
		},
		savePage: function() {
			if (this.savePageTimer) {
				clearTimeout(this.savePageTimer);
				this.savePageTimer = null;
			}
			var self = this;
			this.savePageTimer = setTimeout(function() {
				self.$services.page.update(self.page);
			}, 300);
		},
		isDevelopment: function() {
			return ${environment("development")};	
		},
		hasLanguageSet: function() {
			// the current value can be automatically deduced from the browser settings instead of an active choice by the user
			// the cookieValue is only present if the user has actively chosen a language so check that to allow "unsetting" of the value for json manipulation
			return this.$services.language.current && this.$services.language.cookieValue;
		},
		// the idea was to force the user to select a language if none is selected
		// this however may not be possible if the site does not actually support multiple languages (the language service is always injected if you have CMS)
		triggerConfiguration: function() {
			// if you trigger the $configure event, it is usually for page parameter editing
			// if you don't have a selected language, the result will be stored in the JSON itself
			// this is OK (and intended) for development to have default content but not OK in for example qlty where:
			// a) you might be in a cluster (and only save the json on one server) 
			// b) changes are overwritten on the next deployment
			// so if there is no language service alltogether, we have no option but to store it in the json
			// otherwise you can only "not" have a language if you are in development mode
			if (this.isDevelopment() || !this.$services.language || this.$services.language.current) {
				this.emit("$configure", {});
			}
			else {
				this.$confirm({
					message: "You must select a language"
				});
			}
		},
		setRouteParameters: function(parameters) {
			var blacklist = ["page", "cell", "childComponents", "edit", "pageInstanceId", "stopRerender"];
			var self = this;
			Object.keys(parameters).forEach(function(key) {
				if (blacklist.indexOf(key) < 0) {
					// @2024-10-10: if it does not have the prefix "page", it is sometimes assumed to be in variables which means it will not be correctly picked up as an actual parameter change
					// in theory, route parameters are always page level parameters so it should be fine to prefix them like this, this needs further testing though....
					var finalKey = key;
					if (key.indexOf("page.") != 0) {
						finalKey = "page." + key;
					}
					console.log("setting", key, finalKey, parameters[key]);
					self.set(finalKey, parameters[key]);
				}
			});
			return false;
		},
		set: function(name, value, label) {
			// we added support for custom setting specifically for fragment pages like repeat
			// we create fragment pages usually because we want to scope some state
			// however, when we want to update said state we might not know conclusively where it lives
			// the repeat (and others) can provide a custom set that knows enough of the fragments to decide where the data should go
			if (this.$setValue instanceof Function) {
				this.$setValue(this, name, value, label);
			}
			else {
				this.internalSet(name, value, label);
			}
		},
		internalSet: function(name, value, label) {
			var target = null;
			var parts = null;
			var updateUrl = false;
			// update something in the page parameters
			if (name.indexOf && name.indexOf("page.") == 0) {
				var pageParameter = this.page.content.parameters ? this.page.content.parameters.filter(function(parameter) {
					return parameter.name == name.substring("page.".length).split(".")[0];
				})[0] : null;
				parts = name.substring("page.".length).split(".");
				// @2025-05-20 you can expose a variable as internal AND query parameter
				// so we might also want to update the url when updating an internal page parameter
				var isPublicParameter = this.$services.page.isPublicPageParameter(this.page, name.substring("page.".length));
				if (pageParameter) {
					target = this.variables;
					updateUrl = isPublicParameter && !this.masked;
				}
				else if (isPublicParameter) {
					// check if it is explicitly a query or path parameter, if not, we still put it in the variables!!
					// otherwise we might accidently update the parameters object which is passed along to all children
					target = this.parameters;
					// @2024-03-08: only update the url if we have a public parameter, previously it was updating on _every_ set
					if (!this.masked) {
						updateUrl = true;
					}
				}
				else {
					target = this.variables;
				}
			}
			else if (name.split) {
				parts = name.split(".");
				// we can set the component state without the page. prefix
				target = this.variables;
			}
			// TODO: if single input, single output => can automatically bypass transformer?
			// or set a reverse transformer?
			// for now, transformers are only for going forward, not syncing data back, use events + reload if needed atm
			if (parts && target) {
				for (var i = 0; i < parts.length - 1; i++) {
					if (!target[parts[i]]) {
						Vue.set(target, parts[i], {});
					}
					target = target[parts[i]];
				}
				Vue.set(target, parts[parts.length - 1], value);
				// always set label (can be an unset)
				// in the past we set the label to the value if not filled in. however, this means we _have_ to clean it up every time
				// it is not perfect but by setting the label to null, we at least narrow the cleanup routines to those values that actually have a label
				// unclear if all components support this!
				this.$services.page.setValue(this.labels, name, label == null || label == value ? null : label);
				if (updateUrl) {
					// @2024-03-08: the original update did not take into account paths in the parents
					// it is still not entirely clean though because the template internally does a templateUrl as does the updateUrl
					// router needs to get cleaned up
					var route = this.$services.router.get(this.$services.page.alias(this.page));
					if (route.url != null) {
						var alias = this.$services.page.alias(this.page);
						var newUrl = this.$services.router.router.template(alias, this.parameters);
						this.$services.router.router.updateUrl(alias, newUrl, this.parameters);
						/*
						this.$services.router.router.updateUrl(
							route.alias,
							route.url,
							this.parameters,
							route.query)
						*/
					}
				}
				var self = this;
				// if we have a page variable update, check if we have any subscribers
				if (name.indexOf && name.indexOf("page.") == 0) {
					// we want to alert anyone listening to a parent as well that something has changed
					while (name != null) {
						if (this.subscriptions[name]) {
							var valueToEmit = self.get(name);
							this.subscriptions[name].forEach(function(handler) {
								handler(valueToEmit);
							});
						}
						var index = name.lastIndexOf(".");
						if (index < 0) {
							name = null;
							break;
						}
						else {
							name = name.substring(0, index);
						}
					}
				}
			}
			else {
				console.log("Could not set", name, value);
			}
		},
		pageContentTag: function() {
			if (!this.page.content.pageType || this.page.content.pageType == "page") {
				return null;
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			return provider ? provider.pageContentTag : null;
		},
		pageTag: function() {
			// the default
			if (!this.page.content.pageType || this.page.content.pageType == "page") {
				return "div";
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			// special override for editing purposes
			if (this.edit && provider && provider.pageTagEdit) {
				return provider.pageTagEdit;
			}
			return provider && provider.pageTag ? provider.pageTag : "div";
		},
		getPageTypes: function(value) {
			var items = ['page'];
			nabu.utils.arrays.merge(items, nabu.page.providers("page-type").map(function(x) { return x.name }));
			if (value) {
				items = items.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return items;
		},
		// ported from page-rows
		hasConfigure: function(cell) {
			var self = this;
			var pageInstance = this;
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			return cellInstance && cellInstance.configure;
		},
		getRouteParameters: function(cell) {
			var route = this.$services.router.get(cell.alias);
			return route ? this.$services.page.getRouteParameters(route) : {};
		},
		getAvailableParameters: function(cell) {
			return this.$services.page.getAvailableParameters(this.page, cell, true);
		},
		/*
		double copy paste?
		getAvailableEvents: function(event) {
			var available = this.getEvents();
			var result = Object.keys(available);
			if (event) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(event.toLowerCase()) >= 0;
				});
			}
			result.sort();
			return result;
		},
		*/
		canConfigureInline: function(cell) {
			if (!cell) {
				return false;
			}
			var pageInstance = this;
			var component = pageInstance.getComponentForCell(cell.id);
			if (component && component.configurator) {
				return component;
			}
			return false;
		},
		getCellConfigurator: function(cell) {
			var pageInstance = this;
			var component = pageInstance.getComponentForCell(cell.id);
			return component && component.configurator();
		},
		getCellConfiguratorInput: function(cell) {
			var pageInstance = this;
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			var result = {};
			if (cellInstance.$options.props) {
				Object.keys(cellInstance.$options.props).forEach(function(prop) {
					result[prop] = cellInstance[prop];
				});
			}
			return result;
		},
		addDevice: function(cell) {
			if (!cell.devices) {
				Vue.set(cell, "devices", []);
			}
			cell.devices.push({name: null, operator: '>'});
		},
		suggestDevices: function(value) {
			var devices = this.$services.page.devices.map(function(x) { return x.name }); 
			if (value && value.match(/[0-9]+/)) { 
				devices.unshift(value) 
			}
			return devices;
		},
		removeCell: function(cells, cell) {
			var self = this;
			this.$confirm({
				title: "Delete cell",
				message: "Are you sure you want to delete this cell?"
			}).then(function() {
				self.$services.page.closeRight();
				cells.splice(cells.indexOf(cell), 1);
			});
		},
		/*
		// presumably wrong copy paste...
		removeRow: function(cell, row) { 
			cell.rows.splice(cell.rows(indexOf(row), 1));
		},
		*/
		removeInstance: function(target, name) {
			// currently just reset the instances thing, we currently only allow one
			Vue.set(target, "instances", {});	
		},
		renameInstance: function(target, oldName, newName) {
			Vue.set(target.instances, newName, target.instances[oldName]);
			Vue.delete(target.instances, oldName);
		},
		setContent: function(cell) {
			var self = this;
			this.$prompt(function() {
				return new nabu.page.views.PageAddCell({propsData: {
					page: self.page
				}});
			}).then(function(content) {
				nabu.utils.objects.merge(cell, content);
			});
		},
		copyCell: function(cell) {
			nabu.utils.objects.copy({
				type: "page-cell",
				content: cell
			});
			this.$services.page.copiedCell = JSON.parse(JSON.stringify(cell));
			this.$services.page.copiedRow = null;
		},
		copyRow: function(row) {
			nabu.utils.objects.copy({
				type: "page-row",
				content: row
			});
			this.$services.page.copiedRow = JSON.parse(JSON.stringify(row));
			this.$services.page.copiedCell = null;
		},
		pasteCell: function(row) {
			row.cells.push(this.$services.page.renumber(this.page, this.$services.page.copiedCell));
			this.$services.page.copiedCell = null;
		}
		
	},
	watch: {
		/*parameters: function(newValue) {
			var oldValue = JSON.parse(this.lastParameters);
			var changedValues = [];
			// find all the fields that have changed
			Object.keys(newValue).map(function(name) {
				if (oldValue[name] != newValue[name]) {
					changedValues.push("page." + name);
				}
			});
			this.lastParameters = JSON.stringify(newValue);
			//this.rerender(changedValues);
		},*/
		'page.content.globalEvents': {
			deep: true,
			handler: function(newValue) {
				var self = this;
				if (newValue) {
					newValue.forEach(function(globalEvent) {
						globalEvent.properties = self.getEvents()[globalEvent.localName];
					});
				}
			}
		},
		bodyClasses: function (newVal) {
			var self = this;
			// the context is important here, it has to be the classList object itself
			// otherwise you get an exception like "illegal invocation"
			document.body.classList.remove.apply(document.body.classList, self.oldBodyClasses.splice(0));
			document.body.classList.add.apply(document.body.classList, newVal);
			nabu.utils.arrays.merge(self.oldBodyClasses, newVal);
		},
		'cell.aris': {
			deep: true,
			handler: function(newValue) {
				this.$services.page.setRerender(newValue);
			}
		},
		edit: function(newValue) {
			if (newValue) {
				document.body.setAttribute("page-editing", this.collapsedMenu ? "small" : "large");
			}
			else {
				document.body.removeAttribute("page-editing");
			}
		},
		collapsedMenu: function(newValue) {
			if (this.edit) {
				document.body.setAttribute("page-editing", newValue ? "small" : "large");
			}
		},
		// if you choose a tab, open it
		activeTab: function(newValue) {
			if (this.edit) {
				this.collapsedMenu = false;
			}
		}
	}
});

Vue.component("n-page-rows", {
	template: "#page-rows",
	props: {
		page: {
			type: Object,
			required: true
		},
		rows: {
			type: Array,
			required: true
		},
		edit: {
			type: Boolean,
			required: false
		},
		parameters: {
			type: Object,
			required: false
		},
		events: {
			type: Object,
			required: true
		},
		// pass in state that is built up in rows/cells above (e.g. repeats)
		localState: {
			type: Object,
			required: false
		},
		root: {
			type: Boolean,
			required: false,
			default: false
		},
		stopRerender: {
			type: Boolean,
			required: false,
			default: false
		},
		depth: {
			type: Number,
			default: 0
		}
	},
	methods: {
		rowsTag: function() {
			if (this.depth > 0 || !this.page.content.pageType || this.page.content.pageType == "page") {
				return "div";	
			}
			var self = this;
			var provider = nabu.page.providers("page-type").filter(function(x) {
				return x.name == self.page.content.pageType;
			})[0];
			// special override for editing purposes
			if (this.edit && provider && provider.pageContentTagEdit) {
				return provider.pageContentTagEdit;
			}
			return provider && provider.pageContentTag ? provider.pageContentTag : "div";
		}
	}
});

nabu.page.views.PageOptimized = Vue.component("n-page-optimized", {
	mixins: [Vue.component("n-page")],
	template: "#nabu-optimized-page"
});

nabu.page.views.PageOptimized = Vue.component("n-page-optimized-column", {
	mixins: [Vue.component("n-page")],
	template: "#nabu-optimized-page-column"
});


Vue.component("n-page-row", {
	template: "#page-row",
	props: {
		page: {
			type: Object,
			required: true
		},
		row: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: false
		},
		parameters: {
			type: Object,
			required: false
		},
		stopRerender: {
			type: Boolean,
			required: false,
			default: false
		},
		depth: {
			type: Number,
			default: 0
		},
		root: {
			type: Boolean,
			required: false,
			default: false
		},
		activeViews: {
			type: Array,
			default: function() {
				return []
			}
		}
	},
	data: function() {
		return {
			configuring: null,
			// keeps a reactive boolean linked to the permission resolving
			permissionRendering: {},
			states: []
		}
	},
	created: function() {
		var self = this;
		this.$on("close", function() {
			self.$parent.$emit("close");
		});
	},
	methods: {
		getCurrentStates: function() {
			var states = [];
			nabu.utils.arrays.merge(states, this.states);
			if (this.$parent) {
				nabu.utils.arrays.merge(states, this.$parent.getCurrentStates())
			}
			return states;
		},
		isNoActiveView: function() {
			return this.$services.page.activeViews.length == 0;
		},
		isActiveView: function(view) {
			return this.$services.page.activeViews.indexOf(view) >= 0;
		},
		acivateView: function(view) {
			this.activeViews.splice(0);
			this.activeViews.push(view);
		},
		updateEvent: function(value, label, name) {
			if (this.$parent) {
				this.$parent.$emit("update", value, label, name);
			}
			//this.$emit("update", value, label, name);
		},
		isContentHidden: function(target) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return pageInstance.isContentHidden(target);
		},
		getRendererParameters: function(target) {
			var result = {};
			if (target && target.rendererBindings) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				Object.keys(target.rendererBindings).forEach(function(key) {
					var value = self.$services.page.getBindingValue(pageInstance, target.rendererBindings[key]);
					if (value != null) {
						self.$services.page.setValue(result, key, value);
					}
				});
			}
			return result;
		},
		copyArisStyling: function(event, target) {
			if (target.aris) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				this.$services.page.copiedStyling = JSON.parse(JSON.stringify(target.aris));
				this.$services.notifier.push({
					message: "Copied styling for '" + this.$services.page.formatPageItem(pageInstance, target) + "'",
					severity: this.$services.page.notificationStyle
				});
			}
			event.stopPropagation();
			event.preventDefault();
		},
		pasteArisStyling: function(event, target) {
			if (this.$services.page.copiedStyling) {
				if (target.aris == null) {
					Vue.set(target, "aris", {
						components: {}
					});
				}
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				Vue.set(target, "aris", this.$services.page.copiedStyling);
				this.$services.page.setRerender(target.aris);
				this.$services.notifier.push({
					message: "Pasted styling onto '" + this.$services.page.formatPageItem(pageInstance, target) + "'",
					severity: this.$services.page.notificationStyle
				});
			}
			event.stopPropagation();
			event.preventDefault();
		},
		goto: function(event, row, cell, tab) {
			if (this.edit) {
				this.$emit("select", row, cell, cell ? "cell" : "row", tab ? tab : "selected");
				var doDefault = true;
				var scrollTo = null;
				// if we have a cell target with a configuration, show that, otherwise, we do the generic configuration
				if (cell != null) {
					var component = this.canConfigureInline(cell);
					if (component) {
						this.configuring = cell.id;
					}
					else {
						var self = this;
						var pageInstance = self.$services.page.getPageInstance(self.page, self);
						var cellInstance = pageInstance.getComponentForCell(cell.id);
						if (cellInstance && cellInstance.configure) {
							cellInstance.configure();
							doDefault = false;
						}
					}
					scrollTo = document.getElementById("layout-entry-" + cell.id);
				}
				else {
					scrollTo = document.getElementById("layout-entry-" + row.id);
				}
				if (doDefault) {
					this.configuring = cell ? cell.id : row.id;
				}
				if (scrollTo) {
					scrollTo.scrollIntoView();
				}
				if (event) {
					event.stopPropagation();
					event.preventDefault();
				}
			}
		},
		suggesPageRowClasses: function(value) {
			return this.$services.page.classes("page-row", value).filter(function(x) {
				return ["empty", "is-hover-top", "is-hover-bottom", "is-hover-left", "is-hover-right", "is-hovering"].indexOf(x) < 0;
			});
		},
		getCellById: function(row, cell) {
			return cell.customId && !cell.alias && !cell.rows.length && !cell.renderer ? document.getElementById(cell.customId) : document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
		},
		getRowById: function(row) {
			return row.customId && !row.renderer ? document.getElementById(row.customId) : document.getElementById(this.page.name + "_" + row.id);
		},
		dropCell: function(event, row, cell) {
			if (!cell.alias) {
				var self = this;
				var data = this.$services.page.getDragData(event, "component-alias");
				var cellTarget = this.getCellById(row, cell);
				if (data) {
					cell.alias = data;
					event.preventDefault();
					event.stopPropagation();
				}
				else {
					data = this.$services.page.getDragData(event, "template-content");
					if (data) {
						var structure = JSON.parse(data);
						if (structure.type == "page-cell") {
							self.$services.page.renumber(self.page, structure.content);
							structure = structure.content;
							// do a reactive merge
							Object.keys(structure).forEach(function(key) {
								Vue.set(cell, key, structure[key]);
							});
							/*if (structure.alias) {
								cell.alias = structure.alias;
							}
							if (structure.rows) {
								var rows = structure.rows.map(function(x) { return self.$services.page.renumber(self.page, x) });
								nabu.utils.arrays.merge(cell.rows, rows);
							}*/
							event.preventDefault();
							event.stopPropagation();
						}
					}
				}
			}
		},
		drop: function(event, row) {
			var self = this;
			var data = this.$services.page.getDragData(event, "component-alias");
			var rowTarget = document.getElementById(this.page.name + '_' + row.id);
			var rect = rowTarget.getBoundingClientRect();
			var below = Math.abs(event.clientY - rect.top) >= rect.height - (rect.height / 6);
			var above = Math.abs(event.clientY - rect.top) <= rect.height / 6;
			var left = Math.abs(event.clientX - rect.left) <= rect.width / 6;
			var right = Math.abs(event.clientX - rect.left) >= rect.width - (rect.width / 6);
			if (data) {
				// if we inserted at bottom, get the parent, insert behind it
				if (below) {
					var parent = this.$services.page.getTarget(this.page.content, row.id, true);
					var index = parent.rows.indexOf(row);
					row = this.addRow(parent, true);
					parent.rows.splice(index + 1, 0, row);
				}
				// position above it
				else if (above) {
					var parent = this.$services.page.getTarget(this.page.content, row.id, true);
					var index = parent.rows.indexOf(row);
					row = this.addRow(parent, true);
					parent.rows.splice(index, 0, row);
				}
				var cell = this.addCell(row);
				cell.alias = data;
				event.preventDefault();
				event.stopPropagation();
			}
			else {
				data = this.$services.page.getDragData(event, "template-content");
				if (data) {
					var structure = JSON.parse(data);
					if (structure.type == "page-row" || structure.type == "page-cell") {
						structure = structure.content;
					}
					// we assume the structure is a valid cell or row
					// we want to copy all the stuff configured on the actual cell or row as well
					// renumber the structure
					self.$services.page.renumber(self.page, structure);
					
					// it's a row
					if (structure.cells) {
						//var rows = structure.rows.map(function(x) { return self.$services.page.renumber(self.page, x) });
						var parent = this.$services.page.getTarget(this.page.content, row.id, true);
						var index = parent.rows.indexOf(row);
						if (below) {
							if (index == parent.rows.length - 1) {
								parent.rows.push(structure);
							}
							else {
								parent.rows.splice(index + 1, 0, structure);
							}
							//rows.unshift(0);
							//rows.unshift(index + 1);
							//parent.rows.splice.apply(null, rows);
						}
						else if (above) {
							if (index == 0) {
								parent.rows.unshift(structure);
							}
							else {
								parent.rows.splice(index, 0, structure);
							}
							//rows.unshift(0);
							//rows.unshift(index);
							//parent.rows.splice.apply(null, rows);
						}
						else {
							//var cell = this.addCell(row);
							//nabu.utils.arrays.merge(cell.rows, rows);
							parent.rows.push(structure);
							//cell.rows.push(structure);
						}
					}
					// it's a cell
					else if (structure.rows) {
						//var cells = structure.cells.map(function(x) { return self.$services.page.renumber(self.page, x) });
						var parent = this.$services.page.getTarget(this.page.content, row.id, true);
						var index = parent.rows.indexOf(row);
						if (below) {
							// there is nothing underneath, let's add a row
							if (index >= parent.rows.length - 1) {
								row = self.addRow(parent);
							}
							else {
								row = self.addRow(parent, true);
								parent.rows.splice(index + 1, 0, row);
							}
						}
						else if (above) {
							if (index == 0) {
								row = self.addRow(parent, true);
								parent.rows.unshift(row);
							}
							else {
								row = self.addRow(parent, true);
								parent.rows.splice(index, 0, row);
							}
						}
						row.cells.push(structure);
					}
					if (structure.actions) {
						nabu.utils.arrays.merge(this.page.content.actions, structure.actions);
					}
					event.preventDefault();
					event.stopPropagation();
				}
			}
		},
		dragOverCell: function($event, row, cell) {
			// can only accept drags if there is nothing in the cell yet
			if (!cell.alias && this.edit) {
				var data = this.$services.page.hasDragData($event, "component-alias");
				if (!data) {
					data = this.$services.page.hasDragData($event, "template-content");
					// check that it is the correct type of data
					if (data) {
						var structure = JSON.parse(this.$services.page.getDragData(event, "template-content"));
						// we can only drop cell templates here?
						if (structure.type != "page-cell") {
							data = null;
						}
					}
				}
				// TODO: in the future also drop page-cell and page-row from the side menu?
				if (data) {
					var self = this;
					var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
					this.$services.page.pushDragItem(cellTarget);
					var rect = cellTarget.getBoundingClientRect();
					cellTarget.classList.remove("is-hovering", "is-hover-top", "is-hover-bottom", "is-hover-left", "is-hover-right");
					cellTarget.classList.add("is-hovering");
					$event.preventDefault();
					$event.stopPropagation();
				}
			}
		},
		dragOver: function($event, row) {
			if (this.edit) {
				var data = this.$services.page.hasDragData($event, "component-alias");
				if (!data) {
					data = this.$services.page.hasDragData($event, "template-content");
				}
				// TODO: in the future also drop page-cell and page-row from the side menu?
				if (data) {
					var self = this;
					var rowTarget = document.getElementById(self.page.name + '_' + row.id);
					this.$services.page.pushDragItem(rowTarget);
					var rect = rowTarget.getBoundingClientRect();
					rowTarget.classList.remove("is-hovering", "is-hover-top", "is-hover-bottom", "is-hover-left", "is-hover-right");
					// bottom 15%, highlight bottom
					if (Math.abs(event.clientY - rect.top) >= rect.height - (rect.height / 6)) {
						rowTarget.classList.add("is-hover-bottom");
					}
					// top 15%, highlight top
					else if (Math.abs(event.clientY - rect.top) <= rect.height / 6) {
						rowTarget.classList.add("is-hover-top");
					}
					// not yet sure what this would entail
					/*
					// left 15%
					else if (Math.abs(event.clientX - rect.left) <= rect.width / 6) {
						rowTarget.classList.add("is-hover-left");
					}
					// right 15%
					else if (Math.abs(event.clientX - rect.left) >= rect.width - (rect.width / 6)) {
						rowTarget.classList.add("is-hover-right");
					}
					*/
					else {
						rowTarget.classList.add("is-hovering");
					}
					$event.preventDefault();
					$event.stopPropagation();
				}
			}
		},
		dragExitCell: function($event, row, cell) {
			if (!cell.alias && this.edit) {
				var self = this;
				var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
				if (cellTarget) {
					cellTarget.classList.remove("is-hovering");
				}
				$event.preventDefault();
				$event.stopPropagation();
			}
		},
		dragExit: function($event, row) {
			var self = this;
			var rowTarget = document.getElementById(self.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.remove("is-hovering");
			}
			$event.preventDefault();
			$event.stopPropagation();
		},
		setRowConfiguring: function(id) {
			this.configuring = id;	
		},
		rowTagFor: function(row) {
			var renderer = row.renderer == null ? null : nabu.page.providers("page-renderer").filter(function(x) { return x.name == row.renderer })[0];
			if (renderer == null) {
				var result = this.getPageType(row);
				var pageType = result ? result.pageType : null;
				if (!pageType || pageType == "page") {
					return this.isLinkContainer(row) ? "a" : "div";
				}
				var self = this;
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == pageType;
				})[0];
				var rowTag = null;
				// if it is a function, we can do more stuff
				if (provider && provider.rowTag instanceof Function) {
					rowTag = provider.rowTag(row, this.depth, this.edit, result.path, this.page);
				}
				// special override for editing purposes
				else if (this.edit && provider && provider.rowTagEdit) {
					rowTag = provider.rowTagEdit;
				}
				else if (provider && provider.rowTag) {
					rowTag = provider.rowTag;
				}
				return rowTag ? rowTag : "div";
			}
			else {
				return renderer.component;
			}
		},
		getPageType: function(target) {
			return this.$services.page.getPageType(this.page, target);
		},
		targetHref: function(target) {
			if (this.isLinkContainer(target)) {
				return this.$services.triggerable.calculateUrl(target.triggers[0].actions[0], this, {});
			}
		},
		// a link container is a cell or row that should not be rendered as a div
		isLinkContainer: function(target) {
			// should not have content routed in it
			if (target.renderer == null && target.alias == null) {
				if (target.triggers && target.triggers.length == 1 && target.triggers[0].actions.length == 1 && 
						target.triggers[0].actions[0].type == "route") {
					return true;
				}
			}
			return false;
		},
		// we want explicitly "false" if we are rendering it as a clickable target
		// otherwise you end up dragging the card (or whatever it is) when you swipe on the phone to scroll
		// in the future we might add other draggable logic, but for now in all other cases we don't want a draggable attribute at all
		isDraggable: function(target) {
			if (this.isLinkContainer(target)) {
				return false;
			}	
		},
		cellTagFor: function(row, cell) {
			var renderer = cell.renderer == null ? null : nabu.page.providers("page-renderer").filter(function(x) { return x.name == cell.renderer })[0];
			// once we have a cell.alias, we can not use a renderer!
			// must be enforced here
			// the problem is that we only store a single id for now, if we have a renderer, it will overwrite the id that is already registering the component
			// we "could" find a way around this (component is also registered under instance_<id>) but then we need to do some refactoring on actions
			// where we keep track of the possibility that both exist etc
			// it is an unlikely usecase...
			if (renderer == null || cell.alias) {
				var result = this.getPageType(cell);
				var pageType = result ? result.pageType : null;
				if (!pageType || pageType == "page") {
					return this.isLinkContainer(cell) ? "a" : "div";
				}
				var self = this;
				var provider = nabu.page.providers("page-type").filter(function(x) {
					return x.name == pageType;
				})[0];
				var cellTag = null;
				// if it is a function, we can do more stuff
				if (provider && provider.cellTag instanceof Function) {
					cellTag = provider.cellTag(row, cell, this.depth, this.edit, result.path, this.page);
				}
				// special override for editing purposes
				else if (this.edit && provider && provider.cellTagEdit) {
					cellTag = provider.cellTagEdit;
				}
				else if (provider && provider.cellTag) {
					cellTag = provider.cellTag;
				}
				return cellTag ? cellTag : "div";
			}
			else {
				return renderer.component;
			}
		},
		getInstance: function() {
			return this.$services.page.instances[this.name];	
		},
		getState: function(row, cell) {
			var self = this;
			var localState = this.getLocalState(row, cell);
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			Object.keys(pageInstance.variables).map(function(key) {
				if (typeof(localState[key]) == "undefined") {
					localState[key] = pageInstance.variables[key];
				}
			});
			var page = this.$services.page.getPageParameterValues(this.page, pageInstance);
			if (Object.keys(page).length) {
				localState.page = page;
			}
			return localState;
		},
		getLocalState: function(row, cell) {
			var state = {};
			// inherit state from above
			if (this.localState) {
				var self = this;
				Object.keys(this.localState).map(function(key) {
					state[key] = self.localState[key];
				});
			}
			// add local state of row
			if (row && row.data) {
				Object.keys(row.data).map(function(key) {
					state[key] = row.data[key];
				})
			}
			// add local state of cell
			if (cell && cell.data) {
				Object.keys(cell.data).map(function(key) {
					state[key] = cell.data[key];
				})
			}
			return state;
		},
		getSideBarStyles: function(cell) {
			var styles = [];
			if (cell.width != null) {
				if (typeof(cell.width) == "number" || (cell.width.match && cell.width.match(/^[0-9.]+$/))) {
					styles.push({'flex-grow': cell.width});
				}
				else {
					styles.push({'min-width': cell.width});
				}
			}
			return styles;
		},
		getStyles: function(cell) {
			var width = cell.width;
			var styles = [];
			if (width != null) {
				if (typeof(width) == "number" || (width.match && width.match(/^[0-9.]+$/))) {
					styles.push({'flex-grow': width});
				}
				else {
					styles.push({'min-width': width});
				}
			}
			if (cell.height) {
				styles.push({'height': cell.height});
			}
			if (false && (this.edit || this.$services.page.wantEdit) && cell.name) {
				styles.push({"border": "solid 2px " + this.getNameColor(cell.name), "border-style": "none solid solid solid"})
			}
			if (cell.styleVariables) {
				this.$services.page.getDynamicVariables(cell.styleVariables, this.variables, this).forEach(function(variable) {
					var single = {};
					single["--" + variable.name] = variable.value;
					styles.push(single);
				});
			}
			return styles;
		},
		hasPageRoute: function(cell) {
			if (cell.alias) {
				var route = this.$services.router.get(cell.alias);
				if (route && route.isPage) {
					return true;
				}
			}
			return false;
		},
		up: function(row) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var replacement = this.rows[index - 1];
				this.rows.splice(index - 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		down: function(row) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var replacement = this.rows[index + 1];
				this.rows.splice(index + 1, 1, row);
				this.rows.splice(index, 1, replacement);
			}
		},
		cellDown: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var target = this.rows[index + 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		cellUp: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var target = this.rows[index - 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
			}
		},
		left: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index > 0) {
				var replacement = row.cells[index - 1];
				row.cells.splice(index - 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		right: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index < row.cells.length - 1) {
				var replacement = row.cells[index + 1];
				row.cells.splice(index + 1, 1, cell);
				row.cells.splice(index, 1, replacement);
			}
		},
		canConfigure: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var component = pageInstance.getComponentForCell(cell.id);
			return component && component.configure;
		},
		canConfigureInline: function(cell) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			var component = pageInstance.getComponentForCell(cell.id);
			if (component && component.configurator) {
				return component;
			}
			return false;
		},
		configureCell: function(event, row, cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var component = pageInstance.getComponentForCell(cell.id);
			if (component && component.configurator) {
				this.goto(event, row, cell, "cell");
			}
			// backwards compatible
			else if (component.configure) {
				component.configure();
			}
			else {
				this.goto(event, row, cell, "cell");
			}
		},
		close: function(row, cell, childRow) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// if we didn't close anything, we want to send this up to the parent
			var closed = false;
			if (cell && this.$services.page.isCloseable(cell)) {
				closed = true;
				Vue.set(pageInstance.closed, cell.id, cell.on ? cell.on : "$any");
				// if we want to cascade, don't mark the closed as done
				if (cell.cascadeClose) {
					closed = false;
				}
			}
			if (row && this.$services.page.isCloseable(row)) {
				closed = true;
				Vue.set(pageInstance.closed, row.id, row.on ? row.on : "$any");
				// if we want to cascade, don't mark the closed as done
				if (row.cascadeClose) {
					closed = false;
				}
			}
			if (childRow && this.$services.page.isCloseable(childRow)) {
				closed = true;
				Vue.set(pageInstance.closed, childRow.id, childRow.on ? childRow.on : "$any");
				// if we want to cascade, don't mark the closed as done
				if (childRow.cascadeClose) {
					closed = false;
				}
			}
			if (!closed) {
				this.$parent.$emit("close");
			}
		},
		shouldRenderRow: function(row) {
			if (this.edit) {
				return true;
			}
			// if we have width limitations, check those first
			if (row.devices) {
				if (!this.isDevice(row.devices)) {
					return false;
				}
			}
			if (!!row.condition) {
				if (!this.$services.page.isCondition(row.condition, this.getState(row), this)) {
					return false;
				}
			}
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			if (row.permission || row.permissionContext || row.permissionServiceContext) {
				var permission = row.permission && row.permission.indexOf("=") == 0 ? this.$services.page.interpret(row.permission, this) : row.permission;
				var permissionContext = row.permissionContext && row.permissionContext.indexOf("=") == 0 ? this.$services.page.interpret(row.permissionContext, this) : row.permissionContext;
				var permissionServiceContext = row.permissionServiceContext && row.permissionServiceContext.indexOf("=") == 0 ? this.$services.page.interpret(row.permissionServiceContext, this) : row.permissionServiceContext;
				if (!permissionServiceContext) {
					permissionServiceContext = pageInstance.getServiceContext();
				}
				var key = permissionServiceContext + "::" + permissionContext + "::" + permission;
				// if we haven't resolved it yet, do so
				if (!this.permissionRendering.hasOwnProperty(key)) {
					Vue.set(this.permissionRendering, key, false);
					// if successfully resolved, we will render it!
					this.$services.user.can({
						context: permissionContext,
						name: permission,
						serviceContext: permissionServiceContext
					}).then(function() {
						Vue.set(self.permissionRendering, key, true);
					})
				}
				if (this.permissionRendering[key] === false) {
					return this.permissionRendering[key];
				}
			}
			/*
			if (!!row.permission) {
				if (!this.$services.user.hasPermission(row.permission, row.permissionContext, row.permissionServiceContext)) {
					return false;
				}
			}
			else if (!!row.permissionContext) {
				if (!this.$services.user.hasPermissionInContext(row.permissionContext, row.permissionServiceContext)) {
					return false;
				}
			}
			else if (!!row.permissionServiceContext) {
				if (!this.$services.user.hasPermissionInServiceContext(row.permissionServiceContext)) {
					return false;
				}
			}
			*/
			if (row.on) {
				// if we explicitly closed it, leave it closed until it is reset
				if (pageInstance.closed[row.id]) {
					return false;
				}
				else if (!pageInstance.get(row.on)) {
					return false;
				}
			}
			else if (this.$services.page.isCloseable(row) && pageInstance.closed[row.id]) {
				return false;
			}
			if (this.$services.page.isCloseable(row)) {
				return !pageInstance.closed[row.id];
			}
			return true;
		},
		// backwards compatible
		isDevice: function(devices) {
			return this.$services.page.isDevice(devices);
		},
		cellId: function(cell) {
			var cellId = 'page_' + this.pageInstanceId + '_cell_' + cell.id;
			if (cell.on && cell.optimizeVueKey) {
				var self = this;
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				var on = pageInstance.get(cell.on);
				if (on) {
					cellId += JSON.stringify(on);
				}
			}
			return cellId;
		},
		cellClasses: function(cell) {
			var self = this;
			var classes = [];
			if (cell.renderer) {
				var renderer = this.$services.page.getRenderer(cell.renderer);
				if (renderer && renderer.cssComponent) {
					classes.push("is-" + renderer.cssComponent);
				}
			}
			var resultingComponent = null;
			if (classes.length == 0) {
				var result = this.getPageType(cell);
				var pageType = result ? result.pageType : null;
				if (pageType) {
					var provider = nabu.page.providers("page-type").filter(function(x) {
						return x.name == pageType;
					})[0];
					if (provider && cell.renderer && provider[cell.renderer + "Component"] instanceof Function) {
						resultingComponent = provider[cell.renderer + "Component"](cell);
					}
					else if (provider && cell.renderer && provider[cell.renderer + "Component"]) {
						resultingComponent = provider[cell.renderer + "Component"];
					}
					else if (provider && provider.cellComponent instanceof Function) {
						resultingComponent = provider.cellComponent(cell, result.path, this.page);
					}
					else if (provider && provider.cellComponent) {
						resultingComponent = provider.cellComponent;
					}
					if (resultingComponent) {
						classes.push("is-" + resultingComponent);
					}
				}
			}
			// only a page column if we don't have a component yet
			if (classes.length == 0) {
				resultingComponent = "page-column";
				if (this.edit || !cell.target || cell.target == "page") {
					classes.push("is-page-column");
				}
				else if (cell.target == "prompt" || cell.target == "sidebar" || cell.target == "absolute") {
					//classes.push("is-page-prompt");
					// @2023-06-01 we want to be able to apply default column styling, in v1 we differentiated between the two
					classes.push("is-page-column");
				}
				//{'is-page-column': edit || !cell.target || cell.target == 'page', 'page-prompt': cell.target == 'prompt' || cell.target == 'sidebar' || cell.target == 'absolute' }
			}
			if (cell.target == "pane") {
				classes.push("is-pane-layer");
				// check the max layer currently active and go one higher
				var maxLayer = 0;
				document.querySelectorAll(".is-pane-layer").forEach(function(x) {
					if (x.getAttribute("cell-id") != cell.id) {
						x.classList.forEach(function(y) {
							if (y.indexOf("is-pane-layer") == 0) {
								var tmp = y.substring("is-pane-layer".length);
								if (tmp && parseInt(tmp) > maxLayer) {
									maxLayer = parseInt(tmp);
								}
							}
						})
					}
				});
				classes.push("is-pane-layer-" + (maxLayer + 1));
			}
			if (this.$services.page.useAris && cell.aris && cell.aris.components) {
				var children = this.$services.page.calculateArisComponents(cell.aris, cell.alias, this);
				if (children[resultingComponent] && children[resultingComponent].classes) {
					nabu.utils.arrays.merge(classes, children[resultingComponent].classes);
				}
			}
			if (cell.styles) {
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if we use state here, it does not get modified as we send out new events
				// so let's watch the variables instead
				//return this.$services.page.getDynamicClasses(cell.styles, this.state, this);
				nabu.utils.arrays.merge(classes, this.$services.page.getDynamicClasses(cell.styles, pageInstance.variables, this));
			}
			if (cell.states) {
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				cell.states.forEach(function(state) {
					if (!state.condition || self.$services.page.isCondition(state.condition, pageInstance.variables, self)) {
						classes.push("is-" + state.name);
					}
				})
			}
			// if we have an explicit open trigger on click, we explicitly close it as well
			// deprecated
			/*
			if (cell.state.openTrigger == "click") {
				classes.push("is-closed");
			}
			*/
			return classes;
		},
		rowClasses: function(row) {
			var self = this;
			var classes = [];
			if (row.renderer) {
				var renderer = this.$services.page.getRenderer(row.renderer);
				if (renderer && renderer.cssComponent) {
					classes.push("is-" + renderer.cssComponent);
				}
			}
			var resultingComponent = null;
			if (classes.length == 0) {
				var result = this.getPageType(row);
				var pageType = result ? result.pageType : null;
				if (pageType) {
					var provider = nabu.page.providers("page-type").filter(function(x) {
						return x.name == pageType;
					})[0];
					if (provider && row.renderer && provider[row.renderer + "Component"] instanceof Function) {
						resultingComponent = provider[row.renderer + "Component"](row);
					}
					else if (provider && row.renderer && provider[row.renderer + "Component"]) {
						resultingComponent = provider[row.renderer + "Component"];
					}
					else if (provider && provider.rowComponent instanceof Function) {
						resultingComponent = provider.rowComponent(row, result.path, this.page);
					}
					else if (provider && provider.rowComponent) {
						resultingComponent = provider.rowComponent;
					}
					if (resultingComponent) {
						classes.push("is-" + resultingComponent);
					}
				}
			}
			// only a page row if we don't have a component yet
			if (classes.length == 0) {
				resultingComponent = "page-row";
				classes.push("is-page-row");
			}
			if (this.$services.page.useAris && row.aris && row.aris.components) {
				var children = this.$services.page.calculateArisComponents(row.aris, row.renderer, this);
				if (children[resultingComponent] && children[resultingComponent].classes) {
					nabu.utils.arrays.merge(classes, children[resultingComponent].classes);
				}
			}
			if (row.styles) {
				var pageInstance = self.$services.page.getPageInstance(self.page, self);
				// if we use state here, it does not get modified as we send out new events
				// so let's watch the variables instead
				//return this.$services.page.getDynamicClasses(row.styles, this.state, this);
				nabu.utils.arrays.merge(classes, this.$services.page.getDynamicClasses(row.styles, pageInstance.variables, this));
			}
			return classes;
		},
		hasCellClickEvent: function(cell) {
			if (!cell.clickEvent) {
				return false;
			}
			else if (typeof(cell.clickEvent) == "string") {
				return true;
			}
			else {
				return nabu.page.event.getName(cell, "clickEvent");
			}
		},
		shouldRenderCell: function(row, cell) {
			if (this.edit) {
				/*if (row.collapsed) {
					return false;
				}*/
				return true;
			}
			else if (!cell.alias && !cell.rows.length && !cell.customId) {
				return false;
			}
			// if we have width limitations, check those first
			if (cell.devices) {
				if (!this.isDevice(cell.devices)) {
					return false;
				}
			}
			
			if (cell.condition) {
				if (!this.$services.page.isCondition(cell.condition, this.getState(row, cell), this)) {
					return false;
				}
			}
			
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// Check it!
			if (cell.permission || cell.permissionContext || cell.permissionServiceContext) {
				var permission = cell.permission && cell.permission.indexOf("=") == 0 ? this.$services.page.interpret(cell.permission, this) : cell.permission;
				var permissionContext = cell.permissionContext && cell.permissionContext.indexOf("=") == 0 ? this.$services.page.interpret(cell.permissionContext, this) : cell.permissionContext;
				var permissionServiceContext = cell.permissionServiceContext && cell.permissionServiceContext.indexOf("=") == 0 ? this.$services.page.interpret(cell.permissionServiceContext, this) : cell.permissionServiceContext;
				if (!permissionServiceContext) {
					permissionServiceContext = pageInstance.getServiceContext();
				}
				var inversion = cell.permissionInversion ? "::inverse" : "";
				var key = permissionServiceContext + "::" + permissionContext + "::" + permission + inversion;
				// if we haven't resolved it yet, do so
				if (!this.permissionRendering.hasOwnProperty(key)) {
					Vue.set(this.permissionRendering, key, false);
					// if successfully resolved, we will render it!
					this.$services.user.can({
						context: permissionContext,
						name: permission,
						serviceContext: permissionServiceContext
					}).then(function() {
						Vue.set(self.permissionRendering, key, cell.permissionInversion ? false : true);
					})
				}
				if (this.permissionRendering[key] === false) {
					return this.permissionRendering[key];
				}
			}
			/*
			if (!!cell.permission) {
				if (!this.$services.user.hasPermission(cell.permission, cell.permissionContext)) {
					return false;
				}
			}
			else if (!!cell.permissionContext) {
				if (!this.$services.user.hasPermissionInContext(cell.permissionContext, cell.permissionServiceContext)) {
					return false;
				}
			}
			else if (!!cell.permissionServiceContext) {
				if (!this.$services.user.hasPermissionInServiceContext(cell.permissionServiceContext)) {
					return false;
				}
			}
			*/
			// if we depend on an event and it hasn't happened yet, don't render
			// not sure if it will rerender if we close it?
			if (cell.on) {
				// if we explicitly closed it, leave it closed until it is reset
				if (pageInstance.closed[cell.id]) {
					return false;
				}
				else if (!pageInstance.get(cell.on)) {
					return false;
				}
			}
			else if (this.$services.page.isCloseable(cell) && pageInstance.closed[cell.id]) {
				return false;
			}
			var providers = [];
			nabu.page.providers("page-enumerate").map(function(x) {
				providers.push(x.name);
			});
			var consensus =  Object.keys(cell.bindings).reduce(function(consensus, name) {
				// fixed values are always ok
				if (cell.bindings[name] && cell.bindings[name].indexOf && cell.bindings[name].indexOf("fixed") == 0) {
					return consensus;
				}
				else if (cell.bindings[name] && cell.bindings[name].label && cell.bindings[name].label == "fixed") {
					return consensus;
				}
				// always allow enumerated values
				else if (cell.bindings[name] && cell.bindings[name].split && providers.indexOf(cell.bindings[name].split(".")[0]) >= 0) {
					return consensus;
				}
				// if we have a bound value and it does not originate from the (ever present) page, it must come from an event
				// check that the event has occurred
				// use the cell.on to define this?
				// sometimes need to always show an empty table or whatever
				// may need to allow an array in cell.on?
				/*if (cell.bindings[name] && cell.bindings[name].indexOf("page.") != 0) {
					var parts = cell.bindings[name].split(".");
					// if the event does not exist yet, stop
					if (!pageInstance.variables[parts[0]]) {
						return false;
					}
				}*/
				return consensus;
			}, true);
			return consensus;
		},
		// changedValues is an array of field names that have changed, e.g. "page.test" or "select.$all" etc
		shouldRerenderCell: function(cell, changedValues) {
			if (!changedValues || !changedValues.length) {
				return false;
			}
			return Object.keys(cell.bindings).reduce(function(consensus, name) {
				return consensus || changedValues.indexOf(cell.bindings[name]) >= 0;
			}, false);
		},
		getCreatedComponent: function(row, cell) {
			return this.createdComponent.bind(this, row, cell);
		},
		createdComponent: function(row, cell, result) {
			this.$services.page.rendering++;
		},
		mounted: function(cell, row, state, component) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			// especially at startup it can not always be found?
			if (!pageInstance) {
				var current = this;
				// the parent is either the page or a page cell (which is in a row, which might be in the page)
				// either way, we just go up and check if there is a mounted
				// if that is the mounted function of the page, great, if that is the mounted function of another row, it will in turn go up
				while (current.$parent) {
					current = current.$parent;	
					if (current.mounted) {
						current.mounted(cell, row, state, component);
						break;
					}
				}
			}
			else {
				pageInstance.mounted(cell, row, state, component);
			}
			component.$on("close", function() {
				self.close(cell);
			});
		},
		getMountedFor: function(cell, row) {
			return this.mounted.bind(this, cell, row, this.getLocalState(row, cell));
		},
		getCell: function(id) {
			for (var i = 0; i < this.rows.length; i++) {
				if (this.rows[i].cells) {
					for (var j = 0; j < this.rows[i].cells.length; j++) {
						if (this.rows[i].cells[j].id == id) {
							return this.rows[i].cells[j];
						}
					}
				}
			}
			return null;
		},
		getRowEditStyle: function(row) {
			return 'background-color:' + this.getNameColor(row.name) + '; color: #fff';	
		},
		getCellEditStyle: function(cell) {
			return 'background-color:' + this.getNameColor(cell.name) + '; color: #fff';	
		},
		getNameColor: function(name) {
			var saturation = 80;
			var lightness = 40;
			var hash = 0;
			for (var i = 0; i < name.length; i++) {
				hash = name.charCodeAt(i) + ((hash << 5) - hash);
			}
			var hue = hash % 360;
			return 'hsl('+ hue +', '+ saturation +'%, '+ lightness +'%)';
		},
		getParameters: function(row, cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var result = null;
			// to allow other components to map data that is rendered, we have a persistant object that is (by reference) reused to trigger redraws
			if (cell.contentRuntimeAlias && !this.edit) {
				result = pageInstance.variables[cell.contentRuntimeAlias];
				if (result == null) {
					result = {};
					Vue.set(pageInstance.variables, cell.contentRuntimeAlias, result);
				}
			}
			if (result == null) {
				result = {};
			}
			if (!result.page) {
				result.page = this.page;
			}
			if (!result.cell) {
				result.cell = cell;
			}
			if (result.edit == null) {
				result.edit = this.edit;
			}
			if (result.pageInstanceId == null) {
				result.pageInstanceId = this.pageInstanceId;
			}
			if (result.stopRerender == null) {
				result.stopRerender = this.edit;
			}
			/*
			var result = {
				page: this.page,
				// does not seem to serve a purpose, they end up in "parameters.parameters" from the perspective of a child page
//				parameters: this.parameters,
				cell: cell,
				edit: this.edit,
				//state: pageInstance.variables,
				// if we are in edit mode, the local state does not matter
				// and if we add it, we retrigger a redraw everytime we change something
				//localState: this.edit ? null : this.getLocalState(row, cell),
				pageInstanceId: this.pageInstanceId,
				stopRerender: this.edit
			};
			*/
			// if we have an aris aware component, add a childComponents parameter
			if (this.$services.page.useAris && cell && cell.aris && cell.aris.components) {
				result.childComponents = this.$services.page.calculateArisComponents(cell.aris, null, this);
			}
			// if we have a trigger event, add it explicitly to trigger a redraw if needed
			if (cell.on) {
				result[cell.on] = pageInstance.variables[cell.on];
			}
			Object.keys(cell.bindings).map(function(key) {
				if (cell.bindings[key]) {
					var value = self.$services.page.getBindingValue(pageInstance, cell.bindings[key]);
					// only set the value if it actually has some value
					// otherwise we might accidently trigger a redraw with no actual new value
					// if we remove a value that was there before, it will still redraw as the parameters will have fewer keys
					// and adding something "should" trigger redraw anyway
					if (typeof(value) != "undefined" && value != null) {
						result[key] = value;
					}
				}
			});
			return result;
		},
		resetEvents: function() {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			pageInstance.resetEvents();	
		},
		getClickParameters: function($event) {
			var result = {};
			result.ctrl = !!$event.ctrlKey;
			result.shift = !!$event.shiftKey;
			result.alt = !!$event.altKey;
			result.meta = !!$event.metaKey;
			return result;
		},
		clickOnCell: function(row, cell, $event) {
			if (!this.edit && cell && cell.state && cell.state.stopClickPropagation && $event) {
				$event.stopPropagation();
			}
			if (!this.edit && this.$services.triggerable.canTrigger(cell, "click")) {
				if ($event) {
					$event.preventDefault();
				}
				var promise = this.$services.triggerable.trigger(cell, "click", this.getClickParameters($event), this);
				return promise;
			}
		},
		clickOnRow: function(row, $event) {
			if (!this.edit && row && row.state && row.state.stopClickPropagation && $event) {
				$event.stopPropagation();
			}
			if (!this.edit && this.$services.triggerable.canTrigger(row, "click")) {
				if ($event) {
					$event.preventDefault();
				}
				var promise = this.$services.triggerable.trigger(row, "click", this.getClickParameters($event), this);
				return promise;
			}
		},
		clickOnContentCell: function(row, cell) {
			// opentrigger is deprecated, it was a tryout that was never used
			/*
			if (cell.state.openTrigger == "click") {
				var cellInstance = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
				if (cellInstance) {
					if (cellInstance.classList.contains("is-open")) {
						cellInstance.classList.remove("is-open");
						cellInstance.classList.add("is-closed");
					}
					else {
						cellInstance.classList.remove("is-closed");
						cellInstance.classList.add("is-open");
					}
				}
			}
			*/
		},
		autocloseCell: function(row, cell, inside) {
			this.close(row, cell);
			// deprecated
			/*
			if (cell.state.openTrigger == "click") {
				var cellInstance = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
				if (cellInstance) {
					if (cellInstance.classList.contains("is-open")) {
						cellInstance.classList.remove("is-open");
						cellInstance.classList.add("is-closed");
					}
				}
			}
			*/
		},
		
		addCell: function(target) {
			var self = this;
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: null,
				height: null,
				condition: null,
				devices: [],
				clickEvent: null
			};
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			this.$services.page.normalizeAris(this.page, cell);
			target.cells.push(cell);
			return cell;
		},
		addRow: function(target, skipInject) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			var row = {
				id: this.page.content.counter++,
				state: {},
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			};
			if (!skipInject) {
				target.rows.push(row);
				this.$services.page.normalizeAris(this.page, row, "row");
			}
			return row;
		},
		
		rowStyles: function(row) {
			var styles = [];
			if (row.direction == "horizontal") {
				styles.push({"flex-direction": "row"})
			}
			else if (row.direction == "vertical") {
				styles.push({"flex-direction": "column"})
			}
			if (!!row.align) {
				styles.push({"align-items": row.align});
			}
			if (!!row.justify) {
				styles.push({"justify-content": row.justify});
			}
			if (false && (this.edit || this.$services.page.wantEdit) && row.name) {
				styles.push({"border": "solid 2px " + this.getNameColor(row.name), "border-style": "none solid solid solid"})
			}
			if (row.styleVariables) {
				this.$services.page.getDynamicVariables(row.styleVariables, this.variables, this).forEach(function(variable) {
					var single = {};
					single["--" + variable.name] = variable.value;
					styles.push(single);
				});
			}
			return styles;
		},
		rowButtonStyle: function(row) {
			var styles = [];
			if (row.direction == "vertical") {
				styles.push({"display": "inline-block"})
			}
			return styles;
		},
		
		mouseOut: function(event, row, cell) {
			var self = this;
			if (self.edit) {
				var rowTarget = document.getElementById(self.page.name + '_' + row.id);
				if (rowTarget) {
					rowTarget.classList.remove("is-hovering");
				}
				if (cell) {
					var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
					if (cellTarget) {
						cellTarget.classList.remove("is-hovering");
					}
				}
			}
			else {
				if (cell && cell.state && cell.state.stopHoverPropagation) {
					event.stopPropagation();
				}
				if (cell) {
					this.$services.triggerable.untrigger(cell, "hover", this);
				}
				// it's hard to hover a row filled with content so we just trigger it always if you have something
				this.$services.triggerable.untrigger(row, "hover", this);
				if (row && row.state && row.state.stopHoverPropagation) {
					event.stopPropagation();
				}
			}
		},
		mouseOver: function(event, row, cell) {
			if (this.edit) {
				var rowTarget = document.getElementById(this.page.name + '_' + row.id);
				if (rowTarget) {
					rowTarget.classList.add("is-hovering");
				}
				if (cell) {
					var cellTarget = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
					if (cellTarget) {
						cellTarget.classList.add("is-hovering");
					}
					if (!event.shiftKey) {
						event.stopPropagation();
					}
				}
			}
			// in non-edit mode, we want to trigger the hover
			else {
				if (cell && cell.state && cell.state.stopHoverPropagation) {
					event.stopPropagation();
				}
				if (cell) {
					this.$services.triggerable.trigger(cell, "hover", null, this);
				}
				// it's hard to hover a row filled with content so we just trigger it always if you have something
				this.$services.triggerable.trigger(row, "hover", null, this);
				if (row && row.state && row.state.stopHoverPropagation) {
					event.stopPropagation();
				}
			}
		},
		menuHover: function($event) {
			if (this.edit) {
				var self = this;
				if ($event.target.$unhover) {
					clearTimeout($event.target.$unhover);
					$event.target.$unhover = null;
				}
				$event.target.classList.add("is-menu-hovering");
			}
		},
		menuUnhover: function($event) {
			if (this.edit) {
				var self = this;
				$event.target.$unhover = setTimeout(function() {
					$event.target.classList.remove("is-menu-hovering");
					$event.target.$unhover = null;
				}, 500);
			}
		}
	}
});

Vue.component("n-prompt", {
	template: "#n-prompt",
	props: {
		autoclose: {
			type: Boolean,
			required: false
		}
	}
});

Vue.component("n-absolute", {
	template: "#n-absolute",
	props: {
		top: {
			required: false
		},
		bottom: {
			required: false
		},
		left: {
			required: false
		},
		right: {
			required: false
		},
		fixed: {
			required: false
		},
		autoclose: {
			type: Boolean,
			required: false
		},
		snapPoint: {
			type: String,
			default: "top-left"
		}
	},
	data: function() {
		return {
			relativeX: 0,
			relativeY: 0
		}	
	},
	ready: function() {
		// we need the bounding box of the first relative parent
		var relative = this.$el.offsetParent;
		if (relative) {
			var rect = relative.getBoundingClientRect();
			this.relativeX = rect.left;
			this.relativeY = rect.top;
		}
	},
	methods: {
		// if we do this as a computed, it will update everytime we move the mouse
		getStyles: function() {
			var styles = [];
			if (this.top != null) {
				styles.push({"top": this.top });
			}
			if (this.bottom != null) {
				styles.push({"bottom": this.bottom });
			}
			if (this.left != null) {
				styles.push({"left": this.left });
			}
			if (this.right != null) {
				styles.push({"right": this.right });
			}
			// if no specific styling, position it at mouse
			if (!styles.length) {
				// these are not reactive, use mouseX and mouseY if you want reactive coordinates
				var x = this.$services.page.mouseXPassive - this.relativeX;
				var y = this.$services.page.mouseYPassive - this.relativeY;
				styles.push({"left": + x + "px" });
				styles.push({"top": + y + "px"});
				//styles.push({"left": + JSON.parse(JSON.stringify(this.$services.page.mouseX)) + "px" });
				//styles.push({"top": + JSON.parse(JSON.stringify(this.$services.page.mouseY)) + "px"});
			}
			else {
				// we want the positioning (left, top...) to be to a different point than the default top left
				if (this.snapPoint == "center") {
					styles.push({"transform": "translate(-50%, -50%)"});
				}
				else if (this.snapPoint == "bottom-right") {
					styles.push({"transform": "translate(-100%, -100%)"});
				}
				else if (this.snapPoint == "bottom-left") {
					styles.push({"transform": "translate(0, -100%)"});
				}
				else if (this.snapPoint == "top-right") {
					styles.push({"transform": "translate(-100%, 0%)"});
				}
			}
			// can also use fixed positioning
			if (this.fixed) {
				styles.push({"position": "fixed"});
			}
			else {
				styles.push({"position": "absolute"});
			}
			return styles;
		}
	}
});

Vue.component("page-sidemenu", {
	template: "#page-sidemenu",
	props: {
		page: {
			type: Object,
			required: true
		},
		rows: {
			type: Array,
			required: true
		},
		selected: {
			type: Object,
			required: false
		}
	},
	data: function() {
		return {
			opened: [],
			editing: null,
			aliasing: null,
			showMenuItem: null,
			showMenuType: null,
			offsetX: 0,
			offsetY: 0
		}	
	},
	methods: {
		showMenu: function(row, cell, $event) {
			this.offsetX = $event.offsetX;
			this.offsetY = $event.offsetY;
			console.log("offset", this.offsetX, this.offsetY);
			if (cell) {
				this.showMenuType = "cell";
				this.showMenuItem = cell;
			}
			else if (row) {
				this.showMenuType = "row";
				this.showMenuItem = row;
			}
		},
		closeMenu: function() {
			this.showMenuType = null;
			this.showMenuItem = null;
		},
		getCellIcon: function(cell) {
			var self = this;
			if (cell.templateIcon) {
				return cell.templateIcon;
			}
			if (cell.templateReferenceId) {
				var current = this.$services.page.templates.filter(function(x) {
					return x.id == cell.templateReferenceId;
				})[0];
			}
			return current && current.icon ? current.icon : "cube";
		},
		formatPageItem: function(target) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			return this.$services.page.formatPageItem(pageInstance, target);
		},
		requestFocusCell: function(cell) {
			if (this.$refs["cell_" + cell.id] && this.$refs["cell_" + cell.id].length) {
				this.$refs["cell_" + cell.id][0].focus();
			}
		},
		requestFocus: function() {
			var self = this;
			Vue.nextTick(function() {
				console.log("input is", self.$el.querySelector("input"));
				self.$el.querySelector("input").focus();
			});
		},
		wrapCell: function(row, cell) {
			var newCell = this.addCell(row, true);
			// we keep aris styling!
			newCell.aris = cell.aris;
			newCell.name = "Wrapper" + (cell.alias ? " for " + this.$services.page.prettifyRouteAlias(cell.alias) : "");
			cell.aris = null;
			var index = row.cells.indexOf(cell);
			row.cells.splice(index, 1, newCell);
			var row = this.addRow(newCell);
			row.cells.push(cell);
		},
		rotate: function(row) {
			this.$services.page.normalizeAris(this.page, row, "row");
			var options = row.aris.components["page-row"].options;
			// we remove vertical
			var index = options.indexOf("direction_vertical");
			if (index >= 0) {
				options.splice(index, 1);
			}
			// otherwise we add it and remove any explicit horizontal
			else {
				index = options.indexOf("direction_horizontal");
				if (index >= 0) {
					options.splice(index, 1);	
				}
				options.push("direction_vertical");
			}
		},
		up: function(row) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var replacement = this.rows[index - 1];
				this.rows.splice(index - 1, 1, row);
				this.rows.splice(index, 1, replacement);
				// focus so you can do more commands
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + row.id).querySelector("[tabindex]").focus();
				})
			}
		},
		down: function(row) {
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var replacement = this.rows[index + 1];
				this.rows.splice(index + 1, 1, row);
				this.rows.splice(index, 1, replacement);
				// focus so you can do more commands
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + row.id).querySelector("[tabindex]").focus();
				})
			}
		},
		cellDown: function(row, cell) {
			console.log("moving cell down!");
			var index = this.rows.indexOf(row);
			if (index < this.rows.length - 1) {
				var target = this.rows[index + 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + cell.id).querySelector("[tabindex]").focus();
				});
			}
		},
		cellUp: function(row, cell) {
			var index = this.rows.indexOf(row);
			if (index > 0) {
				var target = this.rows[index - 1];
				row.cells.splice(row.cells.indexOf(cell));
				target.cells.push(cell);
				// focus so you can do more commands
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + cell.id).querySelector("[tabindex]").focus();
				});
			}
		},
		left: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index > 0) {
				var replacement = row.cells[index - 1];
				row.cells.splice(index - 1, 1, cell);
				row.cells.splice(index, 1, replacement);
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + cell.id).querySelector("[tabindex]").focus();
				})
			}
		},
		right: function(row, cell) {
			var index = row.cells.indexOf(cell);
			if (index < row.cells.length - 1) {
				var replacement = row.cells[index + 1];
				row.cells.splice(index + 1, 1, cell);
				row.cells.splice(index, 1, replacement);
				Vue.nextTick(function() {
					document.getElementById("layout-entry-" + cell.id).querySelector("[tabindex]").focus();
				})
			}
		},
		mouseOut: function(event, row, cell) {
			var self = this;
			var rowTarget = document.getElementById(self.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.remove("is-hovering");
			}
			if (cell) {
				var cellTarget = document.getElementById(self.page.name + '_' + row.id + '_' + cell.id);
				if (cellTarget) {
					cellTarget.classList.remove("is-hovering");
				}
			}
		},
		mouseOver: function(event, row, cell) {
			var rowTarget = document.getElementById(this.page.name + '_' + row.id);
			if (rowTarget) {
				rowTarget.classList.add("is-hovering");
			}
			if (cell) {
				var cellTarget = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
				if (cellTarget) {
					cellTarget.classList.add("is-hovering");
				}
				if (!event.shiftKey) {
					event.stopPropagation();
				}
			}
		},
		showHtml: function(row, cell) {
			var target = document.getElementById(this.page.name + '_' + row.id);
			if (cell) {
				target = document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
			}
			if (target != null) {
				var html = target.innerHTML;
				this.$services.page.showContent(html);
			}
		},
		scrollIntoView: function(row, cell) {
			var target = this.page.name + '_' + row.id;
			if (cell) {
				target += "_" + cell.id;
			}
			document.getElementById(target).scrollIntoView();
		},
		hasConfigure: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			return cellInstance && cellInstance.configure;
		},
		configure: function(cell) {
			var self = this;
			var pageInstance = self.$services.page.getPageInstance(self.page, self);
			var cellInstance = pageInstance.getComponentForCell(cell.id);
			cellInstance.configure();
		},
		toggleRow: function(row) {
			var index = this.opened.indexOf(row.id);
			if (index < 0) {
				this.opened.push(row.id);
			}
			else {
				this.opened.splice(index, 1);
			}
		},
		selectRow: function(row) {
			var wasSelected = this.selected == row;
			this.$emit("select", row, null, "row");
			var index = this.opened.indexOf(row.id);
			if (index < 0) {
				this.configureRow(row);
				this.opened.push(row.id);
			}	
			else if (wasSelected) {
				this.opened.splice(index, 1);
			}
			else {
				this.configureRow(row);
			}
		},
		configureRow: function(row) {
			var target = this.getRowById(row);
			var parent = target.parentNode;
			while (parent != null && (!parent.__vue__ || !parent.__vue__.setRowConfiguring)) {
				parent = parent.parentNode;
			}
			if (parent) {
				parent.__vue__.setRowConfiguring(row.id);
			}
			//target.parentNode.__vue__.configuring = row.id;
		},
		selectCell: function(row, cell) {
			var wasSelected = this.selected == cell;
			this.$emit("select", row, cell, "cell");
			this.configureCell(row, cell);
		},
		getCellById: function(row, cell) {
			return cell.customId && !cell.alias && !cell.rows.length && !cell.renderer ? document.getElementById(cell.customId) : document.getElementById(this.page.name + '_' + row.id + '_' + cell.id);
		},
		getRowById: function(row) {
			return row.customId && !row.renderer ? document.getElementById(row.customId) : document.getElementById(this.page.name + "_" + row.id);
		},
		configureCell: function(row, cell) {
			var target = this.getCellById(row, cell);
			if (target != null) {
				//target.parentNode.parentNode.__vue__.configuring = cell.id;
				var parent = target.parentNode;
				while (parent != null && (!parent.__vue__ || !parent.__vue__.setRowConfiguring)) {
					parent = parent.parentNode;
				}
				if (parent) {
					parent.__vue__.setRowConfiguring(cell.id);
				}
			}
		},
		addRow: function(target) {
			if (!target.rows) {
				Vue.set(target, "rows", []);
			}
			var row = {
				id: this.page.content.counter++,
				state: {},
				cells: [],
				class: null,
				// a custom id for this row
				customId: null,
				condition: null,
				direction: null,
				align: null,
				on: null,
				collapsed: false,
				name: null
			};
			target.rows.push(row);
			return row;
		},
		removeCell: function(cells, cell) {
			this.$confirm({
				message: "Are you sure you want to remove this cell?"
			}).then(function() {
				cells.splice(cells.indexOf(cell), 1);
			});
		},
		removeRow: function(cell, row) { 
			self.$services.page.closeRight();
			cell.rows.splice(cell.rows(indexOf(row), 1));
		},
		addCell: function(target, skipInject) {
			if (!target.cells) {
				Vue.set(target, "cells", []);
			}
			var cell = {
				id: this.page.content.counter++,
				rows: [],
				// the alias of the route we want to render here (if any)
				alias: null,
				// the route may have input parameters (path + query), these are the relevant bindings
				// the binding variable contains keys for each path/query parameter in the route
				bindings: {},
				name: null,
				// state that is maintained by the cell owner (the route alias)
				// for example it might offer additional configuration
				state: {},
				// the rendering target (e.g. sidebar, prompt,...)
				target: 'page',
				// it can depend on an event of taking place
				on: null,
				// a class for this cell
				class: null,
				// a custom id for this cell
				customId: null,
				// flex width
				width: null,
				height: null,
				condition: null,
				devices: [],
				clickEvent: null
			};
			if (!skipInject) {
				target.cells.push(cell);
				this.$services.page.normalizeAris(this.page, cell);
			}
			return cell;
		},
		copyCell: function(cell) {
			nabu.utils.objects.copy({
				type: "page-cell",
				content: cell
			});
			this.$services.page.copiedCell = JSON.parse(JSON.stringify(cell));
			this.$services.page.copiedRow = null;
		},
		copyRow: function(row) {
			nabu.utils.objects.copy({
				type: "page-row",
				content: row
			});
			this.$services.page.copiedRow = JSON.parse(JSON.stringify(row));
			this.$services.page.copiedCell = null;
		},
		pasteCell: function(row) {
			row.cells.push(this.$services.page.renumber(this.page, this.$services.page.copiedCell));
			//this.$services.page.copiedCell = null;
			// when you paste again, we want a new copy that is not by reference the previous copy!
			this.$services.page.copiedCell = nabu.utils.objects.deepClone(this.$services.page.copiedCell);
		},
		pasteRow: function(cell) {
			if (!cell.rows) {
				Vue.set(cell, "rows", []);
			}
			cell.rows.push(this.$services.page.renumber(this.page, this.$services.page.copiedRow));
			//this.$services.page.copiedRow = null;
			this.$services.page.copiedRow = nabu.utils.objects.deepClone(this.$services.page.copiedRow);
		},
		dragCell: function(event, row, cell) {
			this.$services.page.setDragData(event, "page-cell", cell.id);
			if (event.ctrlKey) {
				this.$services.page.setDragData(event, "drag-action", "copy");
			}
		},
		dragRow: function(event, row) {
			this.$services.page.setDragData(event, "page-row", row.id);
			if (event.ctrlKey) {
				this.$services.page.setDragData(event, "drag-action", "copy");
			}
		},
		acceptDragRow: function(event, row) {
			if (this.$services.page.hasDragData(event, "page-cell")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "page-row")) {
				this.$services.page.pushDragItem(event.target);
				var rect = event.target.getBoundingClientRect();
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					event.target.classList.remove("is-hover-top");
					event.target.classList.add("is-hover-bottom");
				}
				else {
					event.target.classList.remove("is-hover-bottom");
					event.target.classList.add("is-hover-top");
				}
				event.preventDefault();
			}
		},
		acceptDragCell: function(event, row, cell) {
			if (this.$services.page.hasDragData(event, "page-row")) {
				event.preventDefault();
			}
			else if (this.$services.page.hasDragData(event, "page-cell")) {
				this.$services.page.pushDragItem(event.target);
				var rect = event.target.getBoundingClientRect();
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					event.target.classList.remove("is-hover-top");
					event.target.classList.add("is-hover-bottom");
				}
				else {
					event.target.classList.remove("is-hover-bottom");
					event.target.classList.add("is-hover-top");
				}
				event.preventDefault();
			}
		},
		dropRow: function(event, row) {
			var cellId = this.$services.page.getDragData(event, "page-cell");
			var rowId = this.$services.page.getDragData(event, "page-row");
			if (cellId) {
				var content = this.$services.page.getTarget(this.page.content, cellId);
				var action = this.$services.page.getDragData(event, "drag-action");
				if (!row.cells) {
					Vue.set(row, "cells", []);
				}
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					var parent = this.$services.page.getTarget(this.page.content, content.id, true);
					// do nothing, we don't want to add it to ourselves again
					if (parent == row) {
						return null;
					}
					var index = parent.cells.indexOf(content);
					if (index >= 0) {
						parent.cells.splice(index, 1);
						// if we emptied out the cells, remove it
						if (parent.cells.length == 0) {
							var grandParent = this.$services.page.getTarget(this.page.content, parent.id, true);
							index = grandParent.rows.indexOf(parent);
							grandParent.rows.splice(index, 1);
						}
					}
				}
				row.cells.push(content);
			}
			if (rowId && row.id != rowId) {
				var content = this.$services.page.getTarget(this.page.content, rowId);
				var action = this.$services.page.getDragData(event, "drag-action");
				var parent = this.$services.page.getTarget(this.page.content, row.id, true);
				
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					this.$services.page.closeRight();
					var og = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = og.rows.indexOf(content);
					if (index >= 0) {
						og.rows.splice(index, 1);
						// if the og is not the page and the rows are empty and it has no other content, remove it
						if (og.rows.length == 0 && og.id && !og.alias) {
							var grandParent = this.$services.page.getTarget(this.page.content, og.id, true);
							index = grandParent.cells.indexOf(og);
							grandParent.cells.splice(index, 1);
						}
					}
				}
				var rect = event.target.getBoundingClientRect();
				
				var index = parent.rows.indexOf(row);
				// position below it
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					parent.rows.splice(index + 1, 0, content);
				}
				else {
					parent.rows.splice(index, 0, content);
				}
			}
			this.$services.page.clearAllDrag();
		},
		dropCell: function(event, row, cell) {
			var cellId = this.$services.page.getDragData(event, "page-cell");
			var rowId = this.$services.page.getDragData(event, "page-row");
			// if you drop a cell on a cell, you want to position it before or after it
			if (cellId && cell.id != cellId) {
				var content = this.$services.page.getTarget(this.page.content, cellId);
				var action = this.$services.page.getDragData(event, "drag-action");
				var parent = this.$services.page.getTarget(this.page.content, cell.id, true);
				
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					this.$services.page.closeRight();
					var og = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = og.cells.indexOf(content);
					if (index >= 0) {
						og.cells.splice(index, 1);
						if (og.cells.length == 0) {
							var grandParent = this.$services.page.getTarget(this.page.content, og.id, true);
							index = grandParent.rows.indexOf(og);
							grandParent.rows.splice(index, 1);
						}
					}
				}
				
				var rect = event.target.getBoundingClientRect();
				var index = parent.cells.indexOf(cell);
				// position below it
				if (Math.abs(event.clientY - rect.top) >= rect.height / 2) {
					parent.cells.splice(index + 1, 0, content);
				}
				else {
					parent.cells.splice(index, 0, content);
				}
			}
			if (rowId && row.id != rowId) {
				var content = this.$services.page.getTarget(this.page.content, rowId);
				var action = this.$services.page.getDragData(event, "drag-action");
				if (action == "copy") {
					content = JSON.parse(JSON.stringify(content));
					this.$services.page.renumber(this.page, content);
				}
				else {
					var parent = this.$services.page.getTarget(this.page.content, content.id, true);
					var index = parent.rows.indexOf(content);
					if (index >= 0) {
						parent.rows.splice(index, 1);
						// if the parent is not the page and the rows are empty and it has no other content, remove it
						if (parent.rows.length == 0 && parent.id && !parent.alias) {
							var grandParent = this.$services.page.getTarget(this.page.content, parent.id, true);
							index = grandParent.cells.indexOf(parent);
							grandParent.cells.splice(index, 1);
						}
					}
				}
				var rect = event.target.getBoundingClientRect();
				if (!cell.rows) {
					Vue.set(cell, "rows", []);
				}
				cell.rows.push(content);
			}
			this.$services.page.clearAllDrag();
		}
	},
	watch: {
		selected: function(newValue) {
			if (this.rows.indexOf(newValue) >= 0) {
				var index = this.opened.indexOf(newValue.id);
				if (index < 0) {
					this.opened.push(newValue.id);
				}
				this.$emit("open");
			}
			else {
				var self = this;
				this.rows.forEach(function(row) {
					if (row.cells && row.cells.indexOf(newValue) >= 0) {
						var index = self.opened.indexOf(row.id);
						if (index < 0) {
							self.opened.push(row.id);
						}
						self.$emit("open");
					}
				});
			}
		},
		// @2024-01-19
		// this piece of code keeps stealing focus when you are for example typing in a rich text area
		// it is currently unclear why this was added so disabling for now
		// if weird behavior starts popping up, we might be able to deduce why it was added
		/*
		rows: {
			deep: true,
			handler: function() {
				if (this.selected && this.$refs["cell_" + this.selected.id] && this.$refs["cell_" + this.selected.id].length) {
					var self = this;
					setTimeout(function() {
						self.$refs["cell_" + self.selected.id][0].focus();
					}, 0);
				}
			}
		}
		*/
	}
});

Vue.component("aris-editor", {
	template: "#aris-editor",
	props: {
		childComponents: {
			type: Array,
			required: true
		},
		// where to store the changes
		container: {
			type: Object,
			required: true
		},
		specific: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			conditioning: null,
			search: null
		}
	},
	methods: {
		hasAnySearchHits: function(dimension, option) {
			if (!this.search) {
				return true;
			}
			var options = [];
			// a dimension search across all options
			if (!option) {
				nabu.utils.arrays.merge(options, dimension.options);
			}
			else {
				options.push(option);
			}
			var matches = false;
			var regex = new RegExp(this.search.toLowerCase().replace(/[\s]+/g, ".*"));
			options.forEach(function(x) {
				if (!matches && (!!x.name.toLowerCase().match(regex) || !!x.body.toLowerCase().match(regex))) {
					matches = true;
				}
			});
			return matches;
		},
		getAmountOfAppliedOptions: function(component) {
			var self = this;
			var modifiers = this.getAvailableModifiers(component);
			var activeModifiers = Object.keys(modifiers).filter(function(key) {
				return self.isActiveModifier(component, key);
			}).length;
			var dimensions = this.getAvailableDimensions(component);
			var activeOptions = 0;
			dimensions.forEach(function(x) {
				activeOptions += x.options.filter(function(y) {
					return self.isActiveOption(component, x, y.name);
				}).length;
			});
			return activeOptions + activeModifiers;
		},
		// we format it here to prevent having to call it twice for condition
		getFormattedAmountOfAppliedOptions: function(component) {
			var amount = this.getAmountOfAppliedOptions(component);	
			if (this.search) {
				var amountOfHits = this.getAmountOfSearchHits(component);
				return amount ? " (" + amount + " active, " + amountOfHits + " matches)" : " (" + amountOfHits + " matches)";
			}
			return amount ? " (" + amount + " active)" : "";
		},
		getAmountOfSearchHits: function(component) {
			if (!this.search) {
				return 0;
			}
			var self = this;
			return this.getAvailableDimensions(component).filter(function(x) {
				return self.hasAnySearchHits(x);
			}).length;
		},
		formatBody: function(body) {
			return ("\t" + body).replace(/[\n]+/g, "<br/>").replace(/[\t]/g, "&nbsp;&nbsp;&nbsp;");
		},
		getAvailableDimensions: function(childComponent) {
			var hierarchy = this.$services.page.getArisComponentHierarchy(childComponent.component);
			var dimensions = [];
			var self = this;
			hierarchy.forEach(function(component) {
				if (component.dimensions) {
					component.dimensions.forEach(function(x) {
						var current = dimensions.filter(function(y) { return y.name == x.name })[0];
						if (!current) {
							current = {name: x.name };
							dimensions.push(current);
						}
						if (!current.options) {
							current.options = [];
						}
						// a dimension can exist across multiple components (being more specific in a certain extension)
						if (!current.components) {
							current.components = [];
						}
						current.components.push(component.name);
						// only add options that we don't know about yet
						if (current.options.length > 0) {
							x.options.forEach(function(y) {
								var option = current.options.filter(function(z) { return z.name == y.name })[0];
								if (option == null) {
									current.options.push(JSON.parse(JSON.stringify(y)));
								}
								// append the body so we see the full effect
								else if (option.body.indexOf(y.body) < 0) {
									option.body += "\n" + y.body;
								}
							});
						}
						else {
							nabu.utils.arrays.merge(current.options, x.options);
						}
						current.options = current.options.filter(function(x) {
							return self.$services.page.isThemeCompliant(x);
						});
					})
				}
			});
			// a dimension without options is worthless!
			dimensions = dimensions.filter(function(x) {
				return x.options.length > 0;
			});
			// sort the dimensions alphabetically
			dimensions.sort(function(a, b) { return a.name.localeCompare(b.name) });
			return dimensions;
		},
		getAvailableVariants: function(childComponent) {
			var variants = [];
			var self = this;
			this.$services.page.getArisComponentHierarchy(childComponent.component).forEach(function(component) {
				if (component.variants != null) {
					component.variants.filter(function(x) {
						return self.$services.page.isThemeCompliant(x)
					}).forEach(function(variant) {
						var clone = JSON.parse(JSON.stringify(variant));
						clone.component = component.name;
						variants.push(clone);
					});
				}
			});
			return variants;
		},
		getAvailableVariantNames: function(childComponent, value) {
			var variants = [];
			this.getAvailableVariants(childComponent).forEach(function(x) { 
				if (variants.indexOf(x.name) < 0) {
					variants.push(x.name);
				}
			});
			if (value) {
				variants = variants.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			variants.sort();
			return variants;
		},
		isActiveModifier: function(childComponent, modifier) {
			return this.container.components[childComponent.name].modifiers.indexOf(modifier) >= 0;
		},
		hasCondition: function(childComponent, name) {
			return this.container.components[childComponent.name].conditions[name] != null;	
		},
		getCondition: function(childComponent, name) {
			return this.container.components[childComponent.name].conditions[name];	
		},
		setCondition: function(childComponent, name, condition) {
			this.container.components[childComponent.name].conditions[name] = condition == null ? null : condition;
		},
		toggleModifier: function(childComponent, modifier) {
			var index = this.container.components[childComponent.name].modifiers.indexOf(modifier);
			if (index >= 0) {
				this.container.components[childComponent.name].modifiers.splice(index, 1);
				this.container.components[childComponent.name].conditions[modifier] = null;
			}
			else {
				this.container.components[childComponent.name].modifiers.push(modifier);
			}
		},
		getAvailableModifiers: function(childComponent) {
			var current = this.container.components[childComponent.name].variant;
			var available = {};
			var self = this;
			this.getAvailableVariants(childComponent).filter(function(x) {
				return self.$services.page.isThemeCompliant(x) && (x.name == "default" || x.name == current);
			}).forEach(function(x) { 
				if (x.modifiers) {
					x.modifiers.forEach(function(y) {
						if (available[y] == null) {
							available[y] = [];
						}
						available[y].push({
							variant: x.name,
							component: x.component
						});
					})
				} 
			});
			return available;
		},
		getAvailableModifierNames: function(childComponent) {
			var available = Object.keys(this.getAvailableModifiers(childComponent));
			available.sort();
			return available;
		},
		getAvailableOptions: function(childComponent, dimension) {
			var self = this;
			var current = this.getAvailableDimensions(childComponent).filter(function(x) { return self.$services.page.isThemeCompliant(x) && x.name == dimension.name });
			return current ? current.options : [];
		},
		toggleOption: function(childComponent, dimension, option) {
			var index = this.container.components[childComponent.name].options.indexOf(dimension.name + "_" + option);
			if (index >= 0) {
				this.container.components[childComponent.name].options.splice(index, 1);
				this.container.components[childComponent.name].conditions[dimension.name + '_' + option] = null;
			}
			else {
				this.container.components[childComponent.name].options.push(dimension.name + "_" + option);
			}
		},
		isActiveOption: function(childComponent, dimension, option) {
			return this.container.components[childComponent.name].options.indexOf(dimension.name + "_" + option) >= 0;
		},
		listActiveOptions: function(childComponent, dimension) {
			var active = this.container.components[childComponent.name].options.filter(function(x) {
				return x.indexOf(dimension.name + "_") == 0;
			}).map(function(x) {
				return x.substring((dimension.name + "_").length);
			});
			return active.length == 0 ? null : active.join(", ");
		},
		listActiveModifiers: function(childComponent) {
			var active = this.container.components[childComponent.name].modifiers;
			return active.length == 0 ? null : active.join(", ");
		},
		clearOptions: function(childComponent) {
			this.container.components[childComponent.name].variant = null;
			this.container.components[childComponent.name].options.splice(0);
			this.container.components[childComponent.name].modifiers.splice(0);
		},
		clearDimension: function(childComponent, dimension) {
			// we want to retain all options not linked to this dimension
			var retain = this.container.components[childComponent.name].options.filter(function(x) {
				return x.indexOf(dimension + "_") < 0;
			});
			this.container.components[childComponent.name].options.splice(0);
			nabu.utils.arrays.merge(this.container.components[childComponent.name].options, retain);
		},
		saveAsDefaultAris: function(childComponent) {
			var settings = this.container.components[childComponent.name];
			if (settings) {
				var result = "";
				// default variants don't need to be explicitly included!
				if (settings.variant != null && settings.variant != "default") {
					// we need to know which component in the hierarchy the variant is from
					var variants = this.getAvailableVariants(childComponent);
					var applicable = variants.filter(function(x) {
						return x.name == settings.variant;
					})
					applicable.forEach(function(x) {
						// include the variant itself
						result += "\t@include " + x.component + "_variant_" + settings.variant + ";\n";
					});
				}
				var dimensions = this.getAvailableDimensions(childComponent);
				settings.options.forEach(function(x) {
					var parts = x.split("_");
					var dimension = parts[0];
					var option = parts[1];
					var found = dimensions.filter(function(x) {
						return x.name == dimension;
					})[0];
					if (found) {
						found.components.forEach(function(component) {
							result += "\t@include " + component + "_" + dimension + "_" + option + ";\n";
						});
					}
				});
				var modifiers = this.getAvailableModifiers(childComponent);
				settings.modifiers.forEach(function(x) {
					if (modifiers[x] != null) {
						modifiers[x].forEach(function(variant) {
							result += "\t@include " + variant.component + "-" + variant.variant + "_modifier_" + x + ";\n";
						});
					}
				});
				this.$services.swagger.execute("nabu.web.page.core.v2.rest.aris.variant.update", {
					variant: childComponent.component + "_variant_" + (childComponent.defaultVariant ? childComponent.defaultVariant : childComponent.name) + (this.specific && childComponent.name == "page-column" ? "-" + this.specific : ""),
					body: {
						// we want to skip the trailing linefeed
						content: result.length == 0 ? null : result.substring(0, result.length - 1)
					}
				});
			}
			// clear the options, it is now the default!
			this.clearOptions(childComponent);
		},
		prettifyOption: function(option) {
			return option;
		}
	},
	watch: {
		// used for force rerendering of cell in edit mode
		container: {
			deep: true,
			handler: function(newValue) {
				if (newValue && !newValue.hasOwnProperty("rerender")) {
					Object.defineProperty(newValue, "rerender", {
						value: true,
						enumerable: false,
						writable: true
					});
				}
				else {
					newValue.rerender = true;
				}
			}
		}
	}
})

Vue.component("renderer-bindings", {
	template: "#renderer-bindings",
	props: {
		page: {
			type: Object,
			required: true
		},
		target: {
			type: Object,
			required: true
		}
	},
	created: function() {
		console.log("created bindings thing", this.fields);
		if (!this.target.rendererBindings) {
			Vue.set(this.target, "rendererBindings", {});
		}
	},
	computed: {
		fields: function() {
			var fields = [];
			if (this.target.renderer) {
				var state = this.$services.page.getRendererState(this.target.renderer, this.target, this.page, this.$services.page.getAllAvailableParameters(this.page));
				if (state) {
					nabu.utils.arrays.merge(fields, this.$services.page.getSimpleKeysFor(state, true, true));
				}
			}
			console.log("fields are", fields);
			return fields;
		}
	},
	data: function() {
		return {
			automapFrom: null
		}
	},
	methods: {
		automap: function() {
			if (this.automapFrom) {
				var generator = nabu.page.providers("page-generator").filter(function(x) {
					return x.name.toLowerCase() == "form";
				})[0];
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				generator.automap(this.target, pageInstance, this.automapFrom);
			}
		}
	}
});

Vue.component("template-manager", {
	template: "#template-manager",
	props: {
		page: {
			type: Object,
			required: true
		},
		// the cell or row
		target: {
			type: Object,
			required: true
		}
	},
	computed: {
		path: function() {
			return this.$services.page.getTargetPath(this.page.content, this.target.id);
		},
		excluded: function() {
			var self = this;
			return this.path.filter(function(x) { return x.id != self.target.id && !!x.excludeFromTemplate }).length > 0;
		},
		partOfTemplate: function() {
			var self = this;
			return this.path.filter(function(x) { return x.id != self.target.id && !!x.isTemplate }).length > 0;
		},
		latestAvailableVersion: function() {
			var self = this;
			var current = this.$services.page.templates.filter(function(x) {
				return x.id == self.target.templateReferenceId;
			})[0];
			console.log("current version is", current);
			return current ? current.templateVersion : null;
		}
	},
	methods: {
		release: function() {
			// make sure we include this in the stable version!
			this.target.templateVersion++;
			// the current stable release of the template
			this.target.templateStable = JSON.parse(JSON.stringify(this.target));
			// remove any nested stable!! otherwise we keep it indefinitely
			// while this might be nice for versioning, it would just blow up
			this.target.templateStable.templateStable = null;
			// the template (when injected) should not be marked as a template
			this.target.templateStable.isTemplate = false;
			// mark it as a template instance though, otherwise only the availability of the version is a marker which is not very clean
			this.target.templateStable.isTemplateInstance = true;
			// also unset the template id, it is stored in the ref
			this.target.templateStable.templateId = null;
			
			var self = this;
			// on injecting this template into a page, it will be renumbered, we need to keep a reference to the original template
			var createRef = function(target) {
				// the id of the full template
				target.templateReferenceId = self.target.templateId;
				// the id of the content within the template
				target.templateFragmentId = target.id;
				var repeat = target.cells ? target.cells : target.rows;
				if (repeat) {
					// first we remove any exclusions
					var exclusions = repeat.filter(function(x) {
						return !!x.excludeFromTemplate;
					});
					exclusions.forEach(function(exclusion) {
						repeat.splice(repeat.indexOf(exclusion), 1);
					});
					// when we recurse over the remaining
					repeat.forEach(function(single) {
						createRef(single);
					});
				}
			}
			createRef(this.target.templateStable);
		},
		updateToLatest: function() {
			var self = this;
			var latest = this.$services.page.templates.filter(function(x) {
				return x.id == self.target.templateReferenceId;
			})[0];
			var instance = JSON.parse(latest.content).content;
			var getOriginal = function(instance, id) {
				if (instance.id == id) {
					return instance;
				}
				else if (instance.cells) {
					return instance.cells.reduce(function(all, x) {
						return all == null ? getOriginal(x, id) : all;
					}, null);
				}
				else if (instance.rows) {
					return instance.rows.reduce(function(all, x) {
						return all == null ? getOriginal(x, id) : all;
					}, null);
				}
			}
			var recursiveUpdate = function(target) {
				var original = getOriginal(instance, target.templateFragmentId);
				if (original && original.aris) {
					Vue.set(target, "aris", original.aris);
					self.$services.page.setRerender(target.aris);
				}
				if (target.cells) {
					target.cells.forEach(recursiveUpdate);
				}
				if (target.rows){
					target.rows.forEach(recursiveUpdate);
				}
			}
			recursiveUpdate(this.target);
			this.target.templateVersion = latest.templateVersion;
		}
	},
	watch: {
		"target.isTemplate": function(newValue) {
			if (newValue) {
				// the current version of the template, we start a 0 indicating that no release has happened yet
				// we don't immediately release because we want to give you the option to fill in the title etc
				Vue.set(this.target, "templateVersion", 0);
				
				// mark the page as having templates, this is only meant to speed up page checking on larger applications
				Vue.set(this.page.content, "hasTemplates", true);
				
				// make sure we have a template id
				Vue.set(this.target, "templateId", this.page.content.name + "-" + this.target.id);
			}
		}
	}
})

document.addEventListener("keydown", function(event) {
	if (event.key == "s" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.save(event);
	}
	else if (event.key == "d" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.activeTab = 'layout';
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.key == "g" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		if (application.services.page.editing.cell || application.services.page.editing.row) {
			application.services.page.editing.activeTab = 'selected';
			event.preventDefault();
		}
		event.stopPropagation();
	}
	else if (event.key == "b" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.activeTab = 'settings';
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.code == "Digit1" && event.altKey && application.services.page.editing) {
		application.services.page.activeSubTab = "container";
		event.preventDefault();
	}
	else if (event.code == "Digit2" && event.altKey && application.services.page.editing) {
		application.services.page.activeSubTab = "styling";
		event.preventDefault();
	}
	else if (event.code == "Digit3" && event.altKey && application.services.page.editing) {
		application.services.page.activeSubTab = "triggers";
		event.preventDefault();
	}
	else if ((event.code == "Digit4" || event.code == "Digit5" || event.code == "Digit6" || event.code == "Digit7" || event.code == "Digit8" || event.code == "Digit9") && event.altKey && application.services.page.editing) {
		var offset = parseInt(event.code.substring(5)) - 4;
		if (offset < application.services.page.availableSubTabs.length) {
			application.services.page.activeSubTab = application.services.page.availableSubTabs[offset];
		}
		else {
			// no available subtabs, 4 means container
			if (application.services.page.availableSubTabs.length == 0 && event.code == "Digit4") {
				application.services.page.activeSubTab = "component";
			}
			else {
				application.services.page.activeSubTab = "analysis";
			}
		}
		event.preventDefault();
	}
	else if (event.key == "s" && event.altKey && application.services.page.editing) {
		application.services.page.editing.activeTab = "selected";
		application.services.page.activeSubTab = 'styling';
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.key == "t" && event.altKey && application.services.page.editing) {
		application.services.page.editing.activeTab = "selected";
		application.services.page.activeSubTab = 'triggers';
		event.preventDefault();
		event.stopPropagation();
	}
	else if (event.key == "e" && (event.ctrlKey || event.metaKey) && application.services.page.editing) {
		application.services.page.editing.stopEdit();
		event.preventDefault();
		event.stopPropagation();
	}
}, true);

document.addEventListener("dragend", function() {
	application.services.page.clearAllDrag();	
});



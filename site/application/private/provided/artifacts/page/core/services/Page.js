// TODO the page.content.properties don't seem to serve a function currently
// i _think_ the idea was to use it as <meta> tags in the header when the page is routed

if (!nabu) { var nabu = {} };
if (!nabu.page) { nabu.page = {}}

nabu.page.provide = function(spec, implementation) {
	if (!nabu.page.state) {
		nabu.page.state = { providers: [] }
	}
	if (!nabu.page.state.providers[spec]) {
		nabu.page.state.providers[spec] = [];
	}
	nabu.page.state.providers[spec].push(implementation);
}

nabu.page.providers = function(spec) {
	return nabu.page.state && nabu.page.state.providers[spec] ? nabu.page.state.providers[spec] : [];
}

nabu.page.instances = {};

nabu.services.VueService(Vue.extend({
	services: ["swagger", "user", "cookies"],
	data: function() {
		return {
			// the active tab on a page, we want to be able to add additional tabs and keep the last active for the duration of the editing session
			// we want the component configuration by default
			// other options are: container (cell/row), styling (aris), triggers
			activeSubTab: "component",
			// by default we assume a single configuration tab, but more complex components might have more
			availableSubTabs: [],
			showBreadcrumbs: true,
			showRawTranslations: false,
			
			// you can globally activate views
			activeViews: [],
			chosenRoute: null,
			mouseX: 0,
			mouseY: 0,
			counter: 1,
			title: null,
			theme: null,
			restrictToTheme: true,
			home: null,
			homeUser: null,
			pages: [],
			loading: true,
			// application properties
			properties: [],
			environment: null,
			environmentProperties: [],
			// the devices for this application
			devices: [],
			// application styles
			styles: [],
			// templates available for use
			templates: [],
			// full page templates that are available for use
			pageTemplates: [],
			// functions
			functions: [],
			// custom content
			contents: [],
			// any imports
			imports: [],
			applicationState: [],
			translations: [],
			lastCompiled: null,
			customStyle: null,
			cssStep: null,
			editable: false,
			testable: false,
			wantEdit: false,
			copiedRow: null,
			copiedCell: null,
			useEval: false,
			cssLastModified: null,
			cssError: null,
			functionError: null,
			disableReload: true,
			validations: [],
			googleSiteVerification: null,
			// the page we are editing?
			editing: null,
			dragItems: [],
			variables: {},
			geoRefusalTimeout: null,
			location: null,
			showConsole: false,
			// pages can report stuff to show in the console (mostly events)
			reports: [],
			// features that are enabled (necessary for runtime stuff)
			enabledFeatures: [],
			// when testing, you can check the available features and toggle them (either on or off)
			availableFeatures: [],
			toggledFeatures: [],
			// user specific settings
			users: [],
			// the drag/drop doesn't work very well in javafx webview?
			dragTypes: [],
			inspectContent: null,
			consoleTab: null,
			branding: {},
			// the current branding can be a combination of core branding and localized branding
			currentBranding: {},
			defaultLocale: null,
			copiedType: null,
			copiedContent: null,
			rendering: 0,
			// we start off false to mitigate initial faulty stable detection
			stable: false,
			stableTimer: null,
			// we actually start with true, we are assuming you have a v-if bound to this boolean
			// we don't want the cookie banner to temporarily visually appear until we can establish whether or not you accepted them
			// due to the loading strategy this should not occur but still...
			hasAcceptedCookies: true,
			// functions that are run whenever cookie settings change
			cookieHooks: [],
			// you can set a cookie provider, the key is the name of the cookie provider, the value is an array of regexes (or names) of the cookies that belong to this provider
			cookieProviders: {},
			// whether or not to use aris
			useAris: true,
			aris: null,
			// you can copy styling for later pasting
			copiedStyling: null,
			notificationStyle: "success-outline",
			// promise results from conditionals
			conditionalResults: {}
		}
	},
	activate: function(done) {
		// intercept all cookie actions
		this.interceptCookies();
		// make sure we fix the cookie stuff, this uses the cookies services
		// we do this periodically to catch evil scripts!
		this.synchronizeCookies(true);
		
		// check if we have already accepted the cookies
		this.calculateAcceptedCookies();
		
		var self = this;
		// non-reactive
		this.pageCounter = 0;
		//document.title = "%{Loading...}";
		window.addEventListener("paste", function(event) {
			if (self.canEdit()) {
				var data = event.clipboardData.getData("text/plain");
				if (data) {
					try {
						var parsed = JSON.parse(data);
						if (parsed && parsed.type == "page-row") {
							self.copiedRow = parsed.content;
							self.copiedCell = null;
						}
						else if (parsed && parsed.type == "page-cell") {
							self.copiedCell = parsed.content;
							self.copiedRow = null;
						}
						else if (parsed.type && parsed.content) {
							self.copiedType = parsed.type;
							self.copiedContent = parsed.content;
						}
					}
					catch (exception) {
						// ignore
					}
				}
			}
		});
		window.addEventListener("keydown", function(event) {
			//192 in firefox and 222 in chrome?
			if (self.canEdit() && (event.code == "Backquote" || event.which == 121)) {
				self.showConsole = !self.showConsole;
			}
		});
		this.isServerRendering = navigator.userAgent.match(/Nabu-Renderer/);
		this.$services.swagger.offlineHandler = function() {
			// if you have permission to still view the application while offline (e.g. tester), you shouldn't end up here anyway
			// so we don't check the canTest()!
			setTimeout(function() {
				self.$services.router.route("offline", null, null, true);
			}, 1);
		}
		// any cookies you have provided that are not set to auto accept will be added to the cookie providers
		nabu.page.providers("page-cookies").filter(function(x) { return x.name && !x.accept }).forEach(function(x) {
			var group = x.group ? x.group : x.name;
			var name = x.name;
			if (!self.cookieProviders[group]) {
				Vue.set(self.cookieProviders, group, []);
			}
			if (self.cookieProviders[group].indexOf(x.name) < 0) {
				self.cookieProviders[group].push(x.name);
			}
		});
		
		this.activate(done, true);
	},
	clear: function(done) {
		Object.keys(nabu.page.instances).forEach(function(key) {
			nabu.page.instances[key].emit("$clear", {});	
		});
		this.activate(done ? done : function() {}, false);
	},
	computed: {
		enumerators: function() {
			var providers = {};
			nabu.page.providers("page-enumerate").map(function(x) {
				providers[x.name] = x;
			});
			return providers;
		},
		isSsr: function() {
			return navigator.userAgent.match(/Nabu-Renderer/);
		}
	},
	created: function() {
		var self = this;
		document.addEventListener("keydown", function(event) {
			if (event.ctrlKey && event.altKey && event.keyCode == 88) {
				if (self.canEdit()) {
					self.wantEdit = !self.wantEdit;
				}
				else {
					self.$services.router.route("login", null, null, true);
				}
				event.preventDefault();
			}
			else if (self.canEdit()) {
				if (event.key && event.key.toLowerCase() == "f1") {
					if (self.activeViews.indexOf("conditions") < 0) {
						self.activeViews.push("conditions");
					}
					event.stopPropagation();
					event.preventDefault();
				}
				else if (event.key && event.key.toLowerCase() == "f2") {
					if (self.activeViews.indexOf("styling") < 0) {
						self.activeViews.push("styling");
					}
					event.stopPropagation();
					event.preventDefault();
				}
			}
		});
		document.addEventListener("keyup", function(event) {
			if (self.canEdit()) {
				if (event.key && event.key.toLowerCase() == "f1") {
					var index = self.activeViews.indexOf("conditions");
					if (index >= 0) {
						self.activeViews.splice(index, 1);
					}
				}
				else if (event.key && event.key.toLowerCase() == "f2") {
					var index = self.activeViews.indexOf("styling");
					if (index >= 0) {
						self.activeViews.splice(index, 1);
					}
				}
			}
		});
	},
	methods: {
		// cleanup internal variables like $position etc
		cleanup: function(data) {
			var self = this;
			if (data instanceof Array) {
				data.forEach(this.cleanup);
			}
			else if (this.isObject(data)) {
				Object.keys(data).forEach(function(key) {
					if (key.indexOf("$") == 0) {
						delete data[key];
					}
					else {
						self.cleanup(data[key]);
					}
				});
			}
			return data;
		},
		nullify: function(data) {
			var self = this;
			if (data instanceof Array) {
				data.forEach(this.nullify);
			}
			else {
				Object.keys(data).forEach(function(key) {
					if (data[key] != null && self.$services.page.isObject(data[key])) {
						data[key] = self.nullify(data[key]);
					}
					// TODO: if we have an array of complex objects, we need to nullify every one of them, if the result is null for a one, we need to remove it from the array
					if (data[key] instanceof Array && data[key].length == 0) {
						delete data[key];
					}
					if (data[key] == null) {
						delete data[key];
					}
				});
				if (Object.keys(data).length == 0) {
					return null;
				}
			}
			return data;
		},
		getPrettyNameForTypography: function(target) {
			if (target.state && target.state.content) {
				var content = target.state.content.trim();
				// if the content is a pure variable (e.g. for basic table layouts), we don't want the curlies
				if (content.substring(0, 1) == "{") {
					content = content.substring(1);
				}
				if (content.substring(content.length - 1) == "}") {
					content = content.substring(0, content.length - 1);
				}
				// if we don't have spaces, we camel case it (e.g. in the variable example)
				//if (content.indexOf(" ") < 0) {
					content = this.prettify(content);
				//}
				return content;
			}
		},
		isThemeCompliant: function(entry) {
			if (this.theme != null && this.restrictToTheme) {
				return entry.theme == this.theme;
			}
			return true;
		},
		isActiveView: function(view) {
			return this.activeViews.indexOf(view) >= 0;
		},
		// the handler will be called with the resulting component instance once it is done rendering
		renderComponent: function(page, cell, currentInstance, routeAlias, bindings, handler, customValueFunction) {
			var properties = {};
			if (bindings) {
				var self = this;
				var pageInstance = this.$services.page.getPageInstance(page, currentInstance);
				Object.keys(bindings).forEach(function(key) {
					var binding = bindings[key];
					if (binding != null) {
						var value = customValueFunction ? customValueFunction(binding) : self.$services.page.getBindingValue(pageInstance, binding, self);
						if (value != null) {
							self.$services.page.setValue(properties, key, value);
						}
					}
				});
			}
			var target = document.createElement("div");
			this.$services.router.route(routeAlias, properties, target, true).then(handler);
		},
		isPartOfTemplate: function(target) {
			return target.templateReferenceId && !target.templateVersion;
		},
		getTemplateRoot: function(page, target, highest) {
			var path = this.getTargetPath(page.content, target.id);	
			// for nested templates you can wonder whether you want to highest (nearest the root) or lowest (nearest the target)
			// if we want the "highest" root, we want the one m
			if (!highest) {
				path.reverse();
			}
			return path.filter(function(x) {
				return x.templateReferenceId && x.templateVersion;
			})[0];
		},
		getBindings: function(bindings, instance, state) {
			var self = this;
			var parameters = {};
			var pageInstance = self.$services.page.getPageInstance(instance.page, instance);
			Object.keys(bindings).map(function(key) {
				if (bindings[key] != null) {
					var value = null;
					
					// need to check if you want to access local state
					var index = bindings[key].indexOf(".");
					var resolved = false;
					if (index > 0) {
						var variableName = bindings[key].substring(0, index);
						// if we have it in state, that wins
						if (state && state.hasOwnProperty(variableName)) {
							value = self.$services.page.getValue(state, bindings[key]);
							resolved = true;
						}
					}
					if (!resolved) {
						value = self.$services.page.getBindingValue(pageInstance, bindings[key], instance);
					}
					if (value != null) {
						self.$services.page.setValue(parameters, key, value);
					}
				}
			});
			return parameters;
		},
		updateToLatestTemplate: function(target, recursive) {
			var self = this;
			if (target.templateReferenceId) {
				var self = this;
				var latest = this.templates.filter(function(x) {
					return x.id == target.templateReferenceId;
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
				var recursiveUpdate = function(x) {
					var original = getOriginal(instance, x.templateFragmentId);
					if (original && original.aris) {
						Vue.set(x, "aris", original.aris);
						self.$services.page.setRerender(x.aris);
					}
					if (x.cells) {
						x.cells.forEach(recursiveUpdate);
					}
					if (x.rows){
						x.rows.forEach(recursiveUpdate);
					}
				}
				recursiveUpdate(target);
				target.templateVersion = latest.templateVersion;
			}
			// we also recurse into templates, that means if a template is part of a larger template and not updated in the overall template, it might still be updated here
			// but on the flipside, if you just nest natural templates (the more likely usecase), you want all of them to be updated
			if (recursive) {
				if (target.cells) {
					target.cells.forEach(function(x) {
						self.updateToLatestTemplate(x, true);
					});
				}
				if (target.rows) {
					target.rows.forEach(function(x) {
						self.updateToLatestTemplate(x, true);
					});
				}
			}
		},
		watchField: function(pageInstance, field, handler) {
			if (field.indexOf("page.") == 0) {
				field = field.substring("page.".length);
			}
			var self = this;
			var unwatch = null;
			var current = pageInstance.get(field);
			handler(current);
			var parentField = field;
			while (current == null && parentField.indexOf(".") >= 0) {
				var index = parentField.lastIndexOf(".");
				if (index > 0) {
					parentField = parentField.substring(0, index);
					current = pageInstance.get(parentField);
				}
			}
			// if it doesn't exist yet, keep an eye on the page state
			// we tried to be more specific and watch direct parents but this _somehow_ failed
			if (current == null) {
				unwatch = pageInstance.$watch("variables", function(newValue) {
					var result = pageInstance.get("page." + field);
					if (result != null) {
						handler(result);
					}
					unwatch();
					self.watchField(pageInstance, field, handler);
				}, {deep: true});
			}
			// we are not watching the field, but rather a parent
			else if (parentField != field) {
				unwatch = pageInstance.$watch("variables." + parentField, function(newValue) {
					var result = pageInstance.get("page." + field);
					if (result != null) {
						handler(result);
					}
					// always unwatch and restart, not sure how it evolves
					unwatch();
					self.watchField(pageInstance, field, handler);
				}, {deep: true});
			}
			else {
				var watchKey = "variables." + field;
				unwatch = pageInstance.$watch(watchKey, function(newValue) {
					handler(newValue);
					unwatch();
					// may have unset to null, changed to a different array,...
					self.watchField(pageInstance, field, handler);
				}, {deep: true});
			}
			// return a function to stop watching
			return function() {
				if (unwatch != null) {
					unwatch();
				}
			}
		}, 
		getSwaggerOperationInputDefinition: function(operationId) {
			var result = {properties: {}};
			var self = this;
			if (operationId) {
				var operation = this.$services.swagger.operations[operationId];
				if (operation && operation.parameters) {
					var self = this;
					operation.parameters.forEach(function(key) {
						if (key.schema) {
							result.properties[key.name] = self.$services.swagger.resolve(key.schema);
						}
						else {
							result.properties[key.name] = key;
						}
					});
				}
				result.properties["$serviceContext"] = {
					type: "string"
				}
			}
			return result;
		},
		getSwaggerOperationOutputDefinition: function(operationId) {
			var self = this;
			var result = {};
			if (operationId != null) {
				var operation = this.$services.swagger.operations[operationId];
				if (operation && operation.responses["200"]) {
					var response = operation.responses["200"];
					var schema = null;
					if (response && response.schema) {
						schema = this.$services.swagger.resolve(response.schema);
						if (schema) {
							result = schema;
						}
					}
				}
			}
			return result;
		},
		listCloseableItems: function(page, value, includeEventBased) {
			var result = [];
			var search = function(container) {
				if (container.closeable) {
					result.push(container);
				}
				else if (container.on && includeEventBased) {
					result.push(container);
				}
				if (container.cells) {
					container.cells.forEach(search);
				}
				if (container.rows) {
					container.rows.forEach(search);
				}
			}	
			search(page.content);
			if (value) {
				var pageInstance = this.getPageInstance(page);
				var self = this;
				result = result.filter(function(x) {
					return self.formatPageItem(pageInstance, x).toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return result;
		},
		isCloseable: function(target) {
			// it is closeable when you have an event-driven opening (old school)
			// or if you set show toggle!
			// or when you specifically set that it can be closed
			// or when it is rendered somewhere else than the page
			return target.on || target.closeable || (target.target != 'page' && target.target != null);	
		},
		// calculate all the available actions in a page
		getAvailableActions: function(pageInstance, value) {
			var self = this;
			// we care about the available actions, not the input/output etc yet
			// if two actions are named the same but have different input/output, it doesn't matter at this point
			// in the next phase, you select an actual target
			// at that point we have the exact definition of the action
			var available = {};
			pageInstance.getActions().forEach(function(action) {
				available[action.name] = action;
			});
			this.getSingularComponents(pageInstance).forEach(function(component) {
				self.getActions(component, null, pageInstance).forEach(function(action) {
					available[action.name] = action;
				});
			});
			// we also need to check for renderers
			this.getAvailableRenderers(pageInstance.page).forEach(function(target) {
				var renderer = self.getRenderer(target.renderer);
				self.getActions(renderer, target, pageInstance).forEach(function(action) {
					available[action.name] = action;
				});	
			});
			var result = Object.values(available);
			result.sort(function(a, b) {
				return a.name.localeCompare(b.name);
			});
			if (value) {
				result = result.filter(function(x) {
					return x.name.toLowerCase().indexOf(value.toLowerCase()) >= 0
						|| (x.title && x.title.toLowerCase().indexOf(value.toLowerCase()) >= 0);
				})
			}
			return result;
		},
		// get all SINGULAR components
		// components might be registered multiple times (e.g. alias_ and instance_)
		// multiple components might be registered to the same cell (through older means like arbitrary, repeat,...)
		getSingularComponents: function(pageInstance) {
			var components = [];
			Object.keys(pageInstance.components).forEach(function(key) {
				if (key instanceof Number || key.match(/^[0-9]+$/)) {
					if (pageInstance.components[key] && (!(pageInstance.components[key] instanceof Array))) {
						components.push(pageInstance.components[key]);
					}
				}	
			});
			return components;
		},
		// once we've chosen an action, we want to list all the targets that support this
		// we always want a target cell or row
		// this is for a number of reasons:
		// - we want to streamline with renderers
		// - cells and rows always have an identity and metadata like name etc, components might not
		// this provides a better listing
		// in the new way of doing things, normal cells should only every have a single component
		// page arbitrary is (hopefully) deprecated and the old repeat is gone as well
		getActionTargets: function(pageInstance, action, value) {
			var targets = [];
			pageInstance.getActions().forEach(function(x) {
				if (x.name == action) {
					targets.push({
						name: pageInstance.page.name,
						id: "$page",
						runAction: pageInstance.runAction
					});
				}
			})
			var self = this;
			this.getSingularComponents(pageInstance).forEach(function(component) {
				var hasAction = self.getActions(component, null, pageInstance).filter(function(x) {
					return x.name == action;
				}).length > 0;
				if (hasAction) {
					targets.push(component.$$cell ? component.$$cell : component.target);
				}
			});
			// we also need to check for renderers
			// no longer necessary, they are included in the above loop (if they are rendered!)
			/*
			this.getAvailableRenderers(pageInstance.page).forEach(function(target) {
				var renderer = self.getRenderer(target.renderer);
				var hasAction = self.getActions(renderer, target, pageInstance).filter(function(x) {
					return x.name == action;
				}).length > 0;
				if (hasAction) {
					targets.push(target);
				}
			});
			*/
			if (value) {
				targets = targets.filter(function(x) {
					return x.name && x.name.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return targets;
		},
		// we want to look for all components that implement a particular specification
		getSpecificationTargets: function(pageInstance, specification) {
			var targets = [];
			var self = this;
			this.getSingularComponents(pageInstance).forEach(function(component) {
				if (component.getSpecifications && component.getSpecifications().indexOf(specification) >= 0) {
					targets.push(component.$$cell);
				}
			});
			this.getAvailableRenderers(pageInstance.page).forEach(function(target) {
				var renderer = self.getRenderer(target.renderer);
				if (renderer.getSpecifications && renderer.getSpecifications(target).indexOf(specification) >= 0) {
					targets.push(target);
				}
			});
			return targets;
		},
		// the action target is _always_ the id, but it might be a cell, a row or a component within a cell
		// can't combine cell renderers with cell content for now, there is only one id
		// though we do keep an additional reference under instance_<id> to the actual content...
		getActionTarget: function(pageInstance, actionTarget) {
			if (actionTarget == "$page") {
				var interestingPageInstance = pageInstance;
				while (interestingPageInstance.fragmentParent) {
					interestingPageInstance = interestingPageInstance.fragmentParent;
				}
				return interestingPageInstance;
			}
			var target = pageInstance.components[actionTarget];
			if (!target && pageInstance.fragmentParent) {
				target = this.getActionTarget(pageInstance.fragmentParent, actionTarget);
			}
			return target;
		},
		getActionOutput: function(pageInstance, actionTarget, action) {
			var target = this.getActionTarget(pageInstance, actionTarget);
			if (target) {
				var result = this.getActions(target, null, pageInstance).filter(function(x) {
					return x.name == action;
				})[0];
				if (result && result.output && Object.keys(result.output).length > 0) {
					return result.output;
				}
			}
			return null;
		},
		getActionInput: function(pageInstance, actionTarget, action) {
			var target = this.getActionTarget(pageInstance, actionTarget);
			if (target) {
				var result = this.getActions(target, null, pageInstance).filter(function(x) {
					return x.name == action;
				})[0];
				if (result && result.input && Object.keys(result.input).length > 0) {
					return result.input;
				}
			}
			return null;
		},
		// combine all the actions a component supports (including specifications)
		getState: function(component) {
			var state = {};
			if (component.getSpecifications) {
				var specifications = component.getSpecifications();
				var implemented = nabu.page.providers("page-specification").filter(function(x) {
					return specifications.indexOf(x.name) >= 0;
				});
				implemented.forEach(function(x) {
					if (x.state) {
						nabu.utils.objects.merge(state, x.state);
					}
				});
			}
			if (component.getState) {
				nabu.utils.objects.merge(state, component.getState());
			}
		},
		// combine all the actions a component supports (including specifications)
		getActions: function(component, target, pageInstance) {
			var actions = [];
			if (component.getActions) {
				nabu.utils.arrays.merge(actions, component.getActions(target, pageInstance, this.$services));
			}
			if (component.getSpecifications) {
				var specifications = component.getSpecifications(target);
				var implemented = nabu.page.providers("page-specification").filter(function(x) {
					return specifications.indexOf(x.name) >= 0;
				});
				implemented.forEach(function(x) {
					if (x.actions) {
						nabu.utils.arrays.merge(actions, x.actions);
					}
				});
			}
			// we also want to scan renderers
			if (component.target || component.cell || component.row) {
				var rendererTarget = component.target ? component.target : (component.cell ? component.cell : component.row);
				if (rendererTarget && rendererTarget.renderer) {
					var renderer = this.getRenderer(rendererTarget.renderer);
					if (renderer && renderer.getActions) {
						nabu.utils.arrays.merge(actions, renderer.getActions(rendererTarget, pageInstance, this.$services));
					}
					if (renderer && renderer.getSpecifications) {
						var specifications = renderer.getSpecifications(rendererTarget);
						var implemented = nabu.page.providers("page-specification").filter(function(x) {
							return specifications.indexOf(x.name) >= 0;
						});
						implemented.forEach(function(x) {
							if (x.actions) {
								nabu.utils.arrays.merge(actions, x.actions);
							}
						});
					}
				}
			}
			return actions;
		},
		getRenderers: function(type) {
			return nabu.page.providers("page-renderer").filter(function(x) { return x.type == null || x.type == type || (x.type instanceof Array && x.type.indexOf(type) >= 0) });
		},
		getRenderer: function(name) {
			return nabu.page.providers("page-renderer").filter(function(x) { return x.name == name })[0];
		},
		getRendererConfiguration: function(name) {
			var renderer = nabu.page.providers("page-renderer").filter(function(x) { return x.name == name })[0];
			return renderer ? renderer.configuration : null
		},
		// we often need to query the renderer state definition while determining the page state definition
		// this can lead to recursive lookups, so instead, we pass the page state definition to the renderer, it should not try to calculate it on its own
		// this _will_ lead to infinite loops
		getRendererState: function(name, target, page, pageParameters) {
			var renderer = nabu.page.providers("page-renderer").filter(function(x) { return x.name == name })[0];
			var state = renderer && renderer.getState ? renderer.getState(target, page, pageParameters, this.$services) : null;	
			if (!state) {
				state = {properties:{}};
			}
			else if (!state.properties) {
				state.properties = {};
			}
			if (renderer.getSpecifications) {
				var specifications = renderer.getSpecifications(target);
				var implemented = nabu.page.providers("page-specification").filter(function(x) {
					return specifications.indexOf(x.name) >= 0;
				});
				implemented.forEach(function(x) {
					if (x.state) {
						nabu.utils.objects.merge(state.properties, x.state);
					}
				});
			}
			return state;
		},
		// do the reverse from input binding: apply the renderer state to the pageInstance
		applyRendererParameters: function(pageInstance, target, state, dumbMerge) {
			console.log("applying parameters", target, state, dumbMerge);
			if (target && target.rendererBindings) {
				var self = this;
				// note that we also explicitly set null values to allow you to unset
				Object.keys(target.rendererBindings).forEach(function(key) {
					if (target.rendererBindings[key] != null) {
						var merged = false;
						// basic merging works when you are doing field-level bindings
						// but suppose you have an update form and map an entire record to it
						// the record you map is from an update that was triggered by a button in a table
						// if you just merge back the full record into the event, it will still not modify the record in the original table
						// but if we merge it one-deep, we will do a by-reference merge into the necessary objects
						if (!dumbMerge) {
							var existing = pageInstance.get(target.rendererBindings[key]);
							if (existing && self.isObject(existing)) {
								self.mergeObject(existing, self.$services.page.getValue(state, key));
								merged = true;
							}
						}
						if (!merged) {
							pageInstance.set(target.rendererBindings[key], self.$services.page.getValue(state, key));
						}
					}
				});
			}
		},
		calculateAcceptedCookies: function() {
			this.hasAcceptedCookies = !!this.$services.cookies.get("cookie-settings");	
		},
		getAllowedCookies: function() {
			// these technical cookies are always allowed
			// JSESSIONID allows for server-side sessions
			// language allows the user to choose a language, even if not logged in at the time of choosing
			// the device cookie allows for remembering existing user, validating new devices, notifying the user if a new device is used...
			// the realm cookie (in combination with te device cookie) actually holds the secret to remembering users
			// the cookie settings allow to store additional whitelisted cookies
			var allowedCookies = ["JSESSION", "language", "Device-${environment('realm')}", "Realm-${environment('realm')}", "cookie-settings", "geolocation-refused"];
			// check if we have already whitelisted cookies
			var cookieSettings = this.getCookieSettings();
			// each allowed cookie setting is either a name of a cookie, a regex of a cookie or the name of a provider that _has_ regexes
			// the provider is simply to bundle the regexes etc into a readable and reusable name
			var self = this;
			cookieSettings.forEach(function(x) {
				allowedCookies.push(x);
				if (self.cookieProviders[x] instanceof Array) {
					nabu.utils.arrays.merge(allowedCookies, self.cookieProviders[x]);
				}
			});
			// you can whitelist cookies this way without specific user acceptance (e.g. they are technical)
			nabu.page.providers("page-cookies").filter(function(x) { return x.name && x.accept }).forEach(function(x) {
				allowedCookies.push(x.name);
			});
			return allowedCookies;
		},
		getCookieSettings: function() {
			var allowedCookies = [];
			var cookieSettings = this.$services.cookies.get("cookie-settings");
			if (cookieSettings) {
				try {
					nabu.utils.arrays.merge(allowedCookies, JSON.parse(cookieSettings));
				}
				catch (exception) {
					// ignore, someone messed with it?
				}
			}
			return allowedCookies;
		},
		// check if a component is in fact a page
		isPage: function(component) {
			return component && component.$options && component.$options.template && (component.$options.template == "#nabu-page" || component.$options.template == "#nabu-page-optimized");
		},
		pasteItem: function(item) {
			var content = null;
			if (this.isCopied(item)) {
				content = this.copiedContent;
				this.copiedContent = null;
				this.copiedType = null;
			}	
			return content;
		},
		// whether or not this type of item is in the "clipboard"
		isCopied: function(item) {
			return this.copiedType == item;
		},
		// copy it to the clipboard
		copyItem: function(item, content, clone) {
			// if not specified, we set to true
			if (clone == null) {
				clone = true;
			}
			nabu.utils.objects.copy({
				type: item,
				content: content
			});
			this.copiedType = item;
			this.copiedContent = clone ? JSON.parse(JSON.stringify(content)) : content;
		},
		suggestDevices: function(value) {
			var devices = this.devices.map(function(x) { return x.name }); 
			if (value && value.match(/[0-9]+/)) { 
				devices.unshift(value) 
			}
			return devices;
		},
		device: function(operator, name) {
			if (name == null) {
				name = operator.replace(/.*?([\w]+).*?/, "$1").trim();
				operator = operator.replace(/([^\w]+)?.*/, "$1").trim();
			}
			return this.isDevice([{operator: operator, name: name}]);
		},
		isDevice: function(devices) {
			var actual = this.$services.resizer.width;
			for (var i = 0; i < devices.length; i++) {
				if (devices[i].operator && devices[i].name) {
					var operator = devices[i].operator;
					var width = 0;
					if (devices[i].name.match(/[0-9]+/)) {
						width = parseInt(devices[i].name);
					}
					else {
						var device = this.devices.filter(function(x) { return x.name == devices[i].name })[0];
						if (device && device.width) {
							width = parseInt(device.width);
						}
						else if (device && !device.width && device.name == "wide") {
							width = 2560;
						}
						// the default devices!
						else if (device && !device.width && device.name == "desktop") {
							width = 1280;
						}
						else if (device && !device.width && device.name == "tablet") {
							width = 960;
						}
						else if (device && !device.width && device.name == "phone") {
							width = 512;
						}
					}
					// infinitely big, so matches any query requesting larger
					if (width == 0) {
						if (operator != ">" && operator != ">=") {
							return false;
						}
					}
					else if (operator == "<" && actual >= width) {
						return false;
					}
					else if (operator == "<=" && actual > width) {
						return false;
					}
					else if (operator == ">" && actual <= width) {
						return false;
					}
					else if (operator == ">=" && actual < width) {
						return false;
					}
					else if (operator == "==" && actual != width) {
						return false;
					}
				}
			}
			return true;
		},
		getLocale: function() {
			// does the user have an explicitly chosen locale?
			// TODO
			if (this.defaultLocale) {
				return this.defaultLocale;
			}
			else if (navigator.language) {
				return navigator.language;
			}
			// IE
			else if (navigator.userLanguage) {
				return navigator.userLanguage;
			}
			// also IE
			else if (navigator.browserLanguage) {
				return navigator.browserLanguage;
			}
			// default
			else {
				return "en-US";
			}
		},
		mergeObject: function(into, from) {
			var keys = [];
			Object.keys(from).forEach(function(key) {
				if (into[key] instanceof Array && from[key] instanceof Array) {
					into[key].splice(0);
					nabu.utils.arrays.merge(into[key], from[key]);
				}
				else {
					Vue.set(into, key, from[key]);
				}
				keys.push(key);
			});
			// delete the current keys
			Object.keys(into).forEach(function(key) {
				if (keys.indexOf(key) < 0) {
					into[key] = null;
					delete into[key];
				}
			});
		},
		showContent: function(content) {
			this.inspectContent = content;
			this.consoleTab = "inspect";
			this.showConsole = true;
		},
		downloadService: function(operation, parameters, fileName, acceptContentType) {
			var self = this;
			var promise = this.$services.q.defer();
			parameters["$$rawMapper"] = function(response, raw) {
				if (raw.responseType == "blob") {
					response = raw.response;
				}
				else if (raw.responseType == "arraybuffer") {
					response = new Blob(raw.response);
				}
				else if (raw.responseText != null) {
					//response = nabu.utils.binary.blob(raw.responseText, raw.getResponseHeader("Content-Type"));
					response = new Blob([raw.responseText], { type: raw.getResponseHeader("Content-Type")});
				}
				return response;
			};
			if (acceptContentType) {
				parameters["$accept"] = acceptContentType;
			}
			this.$services.swagger.execute(operation, parameters).then(function(result) {
				self.downloadBlob(result, fileName).then(promise, promise);
			}, promise);
			return promise;
		},
		downloadBlob: function(blob, fileName) {
			var promise = this.$services.q.defer();
			var reader = new FileReader();
			reader.readAsDataURL(blob);
			reader.onload = function() {
				var url = reader.result;
				var tag = document.createElement("a");
				document.body.appendChild(tag);
				tag.setAttribute("download", fileName ? fileName : (blob.name ? blob.name : ""));
				tag.setAttribute("href", url);
				tag.click();
				document.body.removeChild(tag);
				promise.resolve();
			};
			return promise;
		},
		download: function(url, errorHandler, successHandler) {
			// use iframes to better handle problems when they occur (e.g. a 500)
			var iframe = iframe = document.createElement('iframe');
			iframe.setAttribute("class", "hiddenDownloader");
			iframe.style.visibility = 'hidden';
			iframe.style.width = "0px";
			iframe.style.height = "0px";
			iframe.style.display = 'none';
			// firefox only triggers this in case we get an error document back
			// chrome always triggers this, even _before_ the download is complete, if we remove the iframe at that point from the DOM, the download fails
			// so we leave the iframe in the DOM at this point
			// we have very few ways to check if the downloaded was successful or not, but we can try to inspect the body of the iframe (its from the same origin) and determine based on the content there
			iframe.onload = function(event) {
				var iframeDocument = iframe.contentDocument || iframe.contentWindow.document;
				// no body or an empty body means it loaded ok!
				if (iframeDocument && (!iframeDocument.body || iframeDocument.body.innerHTML == "")) {
					console.log("File downloaded correctly", url);
					// probably not working as intended!
					if (successHandler) {
						successHandler(url);
					}
				}
				else {
					console.log("file download failed", url);
					if (errorHandler) {
						errorHandler(url);
					}
				}
			}
			// this is never triggered in any browser :(
			iframe.onerror = function(event) {
				console.log("failed!", event);
			}
			document.body.appendChild(iframe);
			if (this.$services.language != null && this.$services.language.current != null) {
				if (url.indexOf("?") <= 0) {
					url += "?language=" + this.$services.language.current;
				}
				else {
					url += "&language=" + this.$services.language.current;
				}
			}
			iframe.src = url;
		},
		// category is a general category of reports, for example we can have "analysis" reports or "event" reports or...
		// the source is where it comes from, this is usually a page, but it could also be a service like the router, swagger,...
		// the type is the general type of the report, for example a click event
		// the name is the specific name of this report, for example a specific event
		// properties can be anything
		report: function(category, source, type, name, properties) {
			if (this.canEdit()) {
				this.reports.unshift({
					category: category,
					source: source,
					type: type,
					name: name,
					timestamp: new Date(),
					properties: properties
				});
				this.limitReports();
			}
		},
		limitReports: function() {
			// if the console is hidden, we want to keep some recent entries but not everything
			if (this.reports.length >= 20 && !this.showConsole) {
				this.reports.splice(20);
			}
		},
		// the additional allows you to easily pass in additional css classes
		getIconHtml: function(icon, additionalCss) {
			var providers = nabu.page.providers("page-icon");
			providers.sort(function(a, b) {
				return a.priority - b.priority;	
			});
			var provider = providers[0];
			return provider.html(icon, additionalCss);
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
		closeRight: function() {
			var right = document.querySelector("#n-sidebar-right-instance");
			if (right && right.__vue__ && right.__vue__.close) {
				right.__vue__.close();
			}
			else if (right && right.$$close) {
				right.$$close();
			}
		},
		clearAllDrag: function() {
			this.clearDrag();
			console.log("-----------> clearing drag");
			this.dragTypes.splice(0);
		},
		clearDrag: function() {
			this.dragItems.splice(0).forEach(function(x) {
				x.classList.remove("is-hover-bottom", "is-hover-top", "is-hovering", "is-hover-left", "is-hover-right");
			});
		},
		// this should work both in regular browers and javafx webview where the drag events are more or less messed up
		setDragData: function(e, type, value) {
			if (e && e.dataTransfer && e.dataTransfer.setData) {
				event.dataTransfer.setData(type, value);
			}
			this.dragTypes.push({type: type, value: value});
		},
		hasDragData: function(event, type) {
			if (type == "operation" && event && event.dataTransfer && event.dataTransfer.data && event.dataTransfer.data.service) {
				return true;
			}
			return (event && event.dataTransfer && event.dataTransfer.types && event.dataTransfer.types.indexOf(type) >= 0)
				|| this.dragTypes.filter(function(x) { return x.type == type }).length > 0;
		},
		getDragData: function(event, type) {
			var value = event && event.dataTransfer && event.dataTransfer.getData ? event.dataTransfer.getData(type) : null;
			if (!value && type == "operation" && event && event.dataTransfer && event.dataTransfer.data && event.dataTransfer.data.service) {
				value = event.dataTransfer.data.service;
			}
			if (!value) {
				value = this.dragTypes.filter(function(x) { return x.type == type })[0];
				if (value) {
					value = value.value;
				}
			}
			return value;
		},
		pushDragItem: function(item) {
			this.clearDrag();
			this.dragItems.push(item);
		},
		parseValue: function(value) {
			if (value == null || value == "null") {
				 return null;
			}
			else if (value === "true") {
				return true;
			}
			else if (value === "false") {
				return false;
			}
			else if (value.match instanceof Function && value.match(/^[0-9]+$/)) {
				return parseInt(value);
			}
			else if (value.match instanceof Function && value.match(/^[0-9.]+$/)) {
				return parseFloat(value);
			}
			return value;
		},
		isClickable: function(element) {
			if (element.classList && element.classList.contains("clickable")) {
				return true;
			}
			else if (element.classList && element.classList.contains("unclickable")) {
				return false;
			}
			else if (element.parentNode) {
				return this.isClickable(element.parentNode);
			}
			else {
				return true;
			}
		},
		getAvailableTypes: function(value) {
			var types = ['string', 'boolean', 'number', 'integer'];
			nabu.utils.arrays.merge(types, Object.keys(this.$services.swagger.swagger.definitions));
			if (value) {
				types = types.filter(function(x) { return x.toLowerCase().indexOf(value.toLowerCase()) >= 0 });
			}
			return types;
		},
		getContent: function(page, key) {
			// if we are in development mode and no explicit language choice is made, don't show the contents, you want the json values
			if (${environment("development")} && (!this.$services.language || !this.$services.language.cookieValue)) {
				return null;
			}
			return this.contents.filter(function(x) {
				// if it is a different page we are not interested
				if (page && x.page != page) {
					return false;
				}
				// if we want a global content, don't take a page content
				else if (!page && x.page) {
					return false;
				}
				else {
					return x.key == key;
				}
			})[0];
		},
		formatFieldsLight: function(value, fields) {
			for (var i = 0; i < fields.length; i++) {
				
			}
		},
		// format a row or cell for human consumption
		formatPageItem: function(pageInstance, target) {
			var component = target.id != null ? pageInstance.getComponentForCell(target.id) : null; 
			// if you explicitly gave it a name, use that
			if (target.name) {
				return target.name;
			}
			// if we can somehow calculate a name for this specific instance, it would be better than other alternatives
			else if (target.id && component != null && component.getPrettyName != null && component.getPrettyName(target) != null) {
				return component.getPrettyName(target);
			}
			// if you have routed content, use a prettified version of the alias
			else if (target.alias) {
				return this.prettifyRouteAlias(target.alias);
			}
			// if you have a renderer, use that
			else if (target.renderer && this.getRenderer(target.renderer)) {
				return this.getRenderer(target.renderer).title;
			}
			// if all else fails, we use the id
			return "" + target.id;
		},
		getRootPage: function(pageInstance) {
			while (pageInstance && pageInstance.fragmentParent) {
				pageInstance = pageInstance.fragmentParent;
			}
			return pageInstance;
		},
		getPageType: function(page, target) {
			// this surfaced as a bottleneck taking up 20% of overhead in certain repeats
			// so instead we cache the value to prevent recalculation
			// the cache is reset when we exit edit mode
			if (!this.calculatedPageTypes) {
				this.calculatedPageTypes = {};
			}
			if (!this.calculatedPageTypes[page.content.name]) {
				this.calculatedPageTypes[page.content.name] = {};
			}
			if (this.calculatedPageTypes[page.content.name]["target-" + target.id] && !this.editing) {
				return this.calculatedPageTypes[page.content.name]["target-" + target.id];
			}
			var self = this;
			var pageType = null;
			var pageInstance = this.getRootPage(this.getPageInstance(page));
			var path = this.$services.page.getTargetPath(pageInstance.page.content, target.id);
			// we check if there is a renderer in the path to this target
			// if so, that renderer can modify how we render the content
//			var path = this.$services.page.getTargetPath(page.content, target.id);
			path.reverse();
			path.forEach(function(x) {
				if (x.renderer && !pageType) {
					var renderer = self.getRenderer(x.renderer);
					if (renderer && renderer.getPageType) {
						pageType = renderer.getPageType(x);
					}
				}
			});
			// fallback to something set on the page (e.g. the repeat does this!)
			if (pageType == null) {
				pageType = page.content.pageType;
			}
			var provider = pageType == null ? null : nabu.page.providers("page-type").filter(function(x) {
				return x.name == pageType;
			})[0];
			var result = {
				pageType: pageType,
				path: path,
				provider: provider
			};	
			if (!this.editing) {
				this.calculatedPageTypes[page.content.name]["target-" + target.id] = result;
				return this.calculatedPageTypes[page.content.name]["target-" + target.id];
			}
			else {
				return result;
			}
		},
		getCellComponents: function(page, cell) {
			var components = [];
			// we _do_ want the default cell component at this point
			// the renderer might expose only additional targets
			// and the styling is always set anyway on the cell itself
			
			var pageType = this.getPageType(page, cell);
			if (pageType && pageType.provider && pageType.provider.cellComponent instanceof Function) {
				var component = pageType.provider.cellComponent(cell, pageType.path, page);
				if (component) {
					components.push({
						title: "Cell",
						name: component,
						component: component
					});
				}
			}
			if (components.length == 0) {
				components.push({
					title: "Cell",
					name: "page-column",
					component: "page-column",
					defaultVariant: "page-column" + (cell.alias ? "-" + cell.alias : "")
				});
			}
			if (cell.renderer) {
				var renderer = this.getRenderer(cell.renderer);	
				if (renderer && renderer.getChildComponents) {
					nabu.utils.arrays.merge(components, renderer.getChildComponents(cell));
				}
			}
			var pageInstance = this.getPageInstance(page);
			var component = pageInstance.getComponentForCell(cell.id);
			if (component != null) {
				if (component.getChildComponents) {
					nabu.utils.arrays.merge(components, component.getChildComponents());
				}
				else {
					var self = this;
					if (component && component.configurator) {
						var configurator = Vue.component(component.configurator());
						configurator = new configurator({propsData: {
							page: self.page,
							cell: cell
						}});
						// destroy cleanly
						configurator.$destroy();
						if (configurator.getChildComponents) {
							nabu.utils.arrays.merge(components, configurator.getChildComponents());
						}
					}
				}
				/*
				We temporarily had the idea to allow full custom styling for separate states but it is disabled for now
				if (component.getPotentialStates) {
					var additional = [];
					component.getPotentialStates().forEach(function(state) {
						components.forEach(function(component) {
							additional.push({
								title: component.title + " (" + state + ")",
								name: component.name + "--" + state,
								component: component.component
							});
						})
					});
					nabu.utils.arrays.merge(components, additional);
				}
				*/
			}
			return components;
		},
		getRowComponents: function(page, row) {
			var components = [];
			
			var pageType = this.getPageType(page, row);
			if (pageType && pageType.provider && pageType.provider.rowComponent instanceof Function) {
				var component = pageType.provider.rowComponent(row, pageType.path, page);
				if (component) {
					components.push({
						title: "Row",
						name: component,
						component: component
					});
				}
			}
			if (components.length == 0) {
				// push the row itself
				components.push({
					title: "Row",
					name: "page-row",
					component: "page-row"
				});
			}
			if (row.renderer) {
				var renderer = this.getRenderer(row.renderer);	
				if (renderer && renderer.getChildComponents) {
					nabu.utils.arrays.merge(components, renderer.getChildComponents(row));
				}
			}
			return components;
		},
		slowNormalizeAris: function(page, container, type) {
			var self = this;
			// sometimes we need to wait until it is all rendered (like when switching alias)
			// not sure why, but waiting twice seems to work for now....
			Vue.nextTick(function() {
				Vue.nextTick(function() {
					self.normalizeAris(page, container, type);
				});
			});
		},
		setRerender: function(cell) {
			if (cell && !cell.hasOwnProperty("rerender")) {
				Object.defineProperty(cell, "rerender", {
					value: true,
					enumerable: false,
					writable: true
				});
			}
			else if (cell) {
				cell.rerender = true;
			}
		},
		normalizeAris: function(page, container, type, components) {
			if (this.useAris) {
				if (container.aris == null) {
					Vue.set(container, "aris", {
						components: {}
					});
				}
				if (components == null && (type == null || type == "row" || type == "cell")) {
					components = type == "row" ? this.getRowComponents(page, container) : this.getCellComponents(page, container);
				}
				components.forEach(function(x) {
					if (container.aris.components[x.name] == null) {
						Vue.set(container.aris.components, x.name, {
							variant: null,
							// applied modifiers (by name)
							modifiers: [],
							// applied options, this is written as "dimension_option"
							options: [],
							// for each modifier and option you can set a condition
							// the key is the name of the modifier or option, the value is the condition
							conditions: {}
						});
					}
					// added later
					if (container.aris.components[x.name].conditions == null) {
						Vue.set(container.aris.components[x.name], "conditions", {});
					}
					if (x.defaultVariant) {
						Vue.set(container.aris.components[x.name], "defaultVariant", x.defaultVariant);
					}
				});
				// set this explicitly, in some cases the watcher is not triggered
				this.setRerender(container.aris);
			}
			return true;
		},
		
		calculateArisComponents: function(container, specific, instance) {
			var childComponents = {};
			var self = this;
			if (container && container.components) {
				// removed repeated key-based access for tiny optimization
				var containerComponents = container.components;
				Object.keys(containerComponents).forEach(function(key) {
					// removed repeated key-based access for tiny optimization
					var containerComponent = containerComponents[key];
					childComponents[key] = {
						classes: []
					};
					if (containerComponent.variant != null) {
						// you can explicitly set it to default to override the other default
						// however, we don't need to include that in the css classes
						if (containerComponent.variant != "default") {
							childComponents[key].classes.push("is-variant-" + containerComponent.variant);
						}
					}
					else if (containerComponent.defaultVariant != null) {
						childComponents[key].classes.push("is-variant-" + containerComponent.defaultVariant);
					}
					// we can have specific subvariants, for example for cells which have an alias
					else if (specific) {
						childComponents[key].classes.push("is-variant-" + key + "-" + specific);
					}
					// we always add the default now, you can always actively choose another variant to start from (the default for instance)
					else {
						childComponents[key].classes.push("is-variant-" + key);
					}
					if (containerComponent.options != null && containerComponent.options.length > 0) {
						containerComponent.options.forEach(function(option) {
							var add = true;
							if (containerComponent.conditions && containerComponent.conditions[option] != null) {
								add = self.isCondition(containerComponent.conditions[option], {}, instance);
							}
							if (add) {
								childComponents[key].classes.push("is-" + option.replace("_", "-"));
							}
						});
					}
					if (containerComponent.modifiers != null && containerComponent.modifiers.length > 0) {
						containerComponent.modifiers.forEach(function(modifier) {
							var add = true;
							if (containerComponent.conditions && containerComponent.conditions[modifier] != null) {
								add = self.isCondition(containerComponent.conditions[modifier], {}, instance);
							}
							if (add) {
								childComponents[key].classes.push("is-" + modifier);
							}
						});
					}
					// if no classes are set, set the default name as variant so themes can target this
	//				if (childComponents[key].classes.length == 0) {
	//					childComponents[key].classes.push("is-variant-" + key);
	//				}
				});
			}
			return childComponents;
		},
		// this returns all the parent components as well
		getArisComponentHierarchy: function(component) {
			var components = this.getArisComponents();
			var hierarchy = [];
			var last = components[component];
			while (last) {
				hierarchy.push(last);
				last = last.extends ? components[last.extends] : null;
			}
			return hierarchy;
		},
		// we hide this behind a function so we can refactor the layout later
		getArisComponents: function() {
			return this.aris;
		},
		activate: function(done, initial) {
			var self = this;
		
			var injectJavascript = function() {
				var promise = self.$services.q.defer();
			
				if (navigator.userAgent.indexOf("Trident") >= 0) {
					promise.resolve();
				}
				else {
					// inject some javascript stuff if we are in edit mode
					//self.inject("https://cdnjs.cloudflare.com/ajax/libs/clipboard.js/2.0.0/clipboard.js");
					// inject ace editor
					// check out https://cdnjs.com/libraries/ace/
					// if it fails, we ignore it and set editing to false
					// too many whitelist issues getting this from CDN, let's just ship it
					/*
					self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ace.js", function() {
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-scss.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-javascript.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/mode-html.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-language_tools.js");
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/ace/1.3.3/ext-whitespace.js");
						promise.resolve();
						// inject sass compiler (no longer used)
						self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.js", function() {
							self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.worker.js", function() {
								promise.resolve();
							});
						});
					}, function() {
						self.editable = false;
						promise.resolve();
					});
					*/
					self.inject("${server.root()}resources/cdn/ace/1.3.3/ace.js", function() {
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-scss.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-javascript.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/mode-html.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/ext-language_tools.js");
						self.inject("${server.root()}resources/cdn/ace/1.3.3/ext-whitespace.js");
						promise.resolve();
						// inject sass compiler
						/*self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.js", function() {
							self.inject("https://cdnjs.cloudflare.com/ajax/libs/sass.js/0.10.9/sass.worker.js", function() {
								promise.resolve();
							});
						});*/
					}, function() {
						self.editable = false;
						promise.resolve();
					});
				}
				return promise;
			}
	
			self.$services.swagger.execute("nabu.web.page.core.v2.rest.configuration.get").then(function(configuration) {
				self.editable = configuration.editable;
				self.testable = configuration.testable;
				self.pages.splice(0, self.pages.length);
				self.properties.splice(0, self.properties.length);
				self.environmentProperties.splice(0);
				self.devices.splice(0, self.devices.length);
				self.contents.splice(0);
				self.translations.splice(0);
				self.enabledFeatures.splice(0);
				self.availableFeatures.splice(0);
				self.toggledFeatures.splice(0);
				self.users.splice(0);
				self.defaultLocale = configuration.defaultLocale;
				self.environment = configuration.environment;
				if (configuration.branding) {
					Vue.set(self, "branding", configuration.branding);
				}
				else {
					Vue.set(self, "branding", {});
				}
				if (configuration.pages) {
					nabu.utils.arrays.merge(self.pages, configuration.pages);
					self.loadPages(self.pages);
					self.loadFormatters(self.pages);
				}
				if (configuration.properties) {
					nabu.utils.arrays.merge(self.properties, configuration.properties);
				}
				if (configuration.environmentProperties) {
					nabu.utils.arrays.merge(self.environmentProperties, configuration.environmentProperties);
				}
				if (configuration.devices) {
					nabu.utils.arrays.merge(self.devices, configuration.devices);
				}
				self.ensureDevices();
				if (configuration.title) {
					self.title = configuration.title;
				}
				if (configuration.theme) {
					self.theme = configuration.theme;
				}
				if (configuration.home) {
					self.home = configuration.home;
				}
				if (configuration.homeUser) {
					self.homeUser = configuration.homeUser;
				}
				if (configuration.users) {
					nabu.utils.arrays.merge(self.users, configuration.users);
				}
				if (configuration.contents) {
					nabu.utils.arrays.merge(self.contents, configuration.contents);
				}
				if (configuration.translations) {
					var decode = function(value) {
						return value.replace(/\\n/g, "\n")
							.replace(/\\"/g, '"');
					}
					nabu.utils.arrays.merge(self.translations, configuration.translations.map(function(x) {
						// configurations are picked up directly from JSON files which have encoded properties
						// so if you were to type a linefeed into a json file, it would become \n, get picked up as such and appear in the translation
						// however, we can't match an encoded \n with an actual linefeed character
						// so we decode it here, currently it is a whitelist of encoded properties
						if (x && x.translation && x.name) {
							x.name = decode(x.name);
							// we assume the user copied the encoded characters
							x.translation = decode(x.translation);
						}
						return x;
					}));
				}
				if (configuration.imports) {
					nabu.utils.arrays.merge(self.imports, configuration.imports);
				}
				if (configuration.state) {
					nabu.utils.arrays.merge(self.applicationState, configuration.state);
				}
				if (configuration.googleSiteVerification) {
					self.googleSiteVerification = configuration.googleSiteVerification;
				}
				if (configuration.geoRefusalTimeout != null) {
					self.geoRefusalTimeout = configuration.geoRefusalTimeout;
				}
				if (self.home || self.homeUser) {
					self.registerHome(self.home, self.homeUser);
				}
				if (configuration.enabledFeatures) {
					nabu.utils.arrays.merge(self.enabledFeatures, configuration.enabledFeatures);
				}
				if (self.geoRefusalTimeout != null && navigator.geolocation) {
					var refused = self.$services.cookies.get("geolocation-refused");
					if (!refused) {
						navigator.geolocation.getCurrentPosition(
							function (position) {
								Vue.set(self, "location", position.coords);
								// update if necessary
								var watchId = navigator.geolocation.watchPosition(function(position) {
									Vue.set(self, "location", position.coords);
								});
								// could cancel the watchid at a later point?
								// navigator.geolocation.clearWatch(watchId);
							},
						// the user may not have given permission?
						function(error) {
							// if the user denied it, set a cookie to remember this for a while
							if (error.code == error.PERMISSION_DENIED && self.geoRefusalTimeout) {
								self.$services.cookies.set("geolocation-refused", "true", self.geoRefusalTimeout);
							}
						});
					}
				}
				if (self.googleSiteVerification) {
					var meta = document.createElement("meta");
					meta.setAttribute("name", "google-site-verification");
					meta.setAttribute("content", self.googleSiteVerification);
					document.head.appendChild(meta);
				}
				// don't do imports for server rendering, they should not be critical to the page and might not be parseable
				if (!navigator.userAgent.match(/Nabu-Renderer/)) {
					self.imports.forEach(function(x) {
						if (x.type == 'javascript') {
							self.inject(self.interpret(x.link), function() {}, function() {}, x.async);
						}
					});
				}
				var promises = [];
				if (self.canEdit()) {
					self.injectEditIcon();
					var editorPromises = [];
					if (self.useAris) {
						editorPromises.push(nabu.utils.ajax({url: "${nabu.web.application.Services.fragment(environment('webApplicationId'), 'nabu.web.page.core.v2.component')/fragment/path}page/aris-definitions"}).then(function(response) {
							self.aris = {};
							JSON.parse(response.responseText).forEach(function(component) {
								self.aris[component.name] = component;
							});
						}));
					}
					editorPromises.push(injectJavascript());
					editorPromises.push(self.$services.swagger.execute("nabu.web.page.core.v2.rest.templates.list").then(function(list) {
						if (list && list.templates) {
							list.templates.forEach(function(template) {
								try {
									var content = JSON.parse(template.content);
									if (content.type == "page") {
										self.pageTemplates.push(template);
									}
									// multiple pages combined!
									else if (content.type == "pages") {
										self.pageTemplates.push(template);
									}
									else {
										self.templates.push(template);
									}
								}
								catch (exception) {
									console.error("Can not parse JSON", exception, template.content);
								}
							});
							//nabu.utils.arrays.merge(self.templates, list.templates);
						}
					}));
					// we probably don't want to wait for these, they should only be relevant once you are actually editing etc which is not _right_ away
					if (false) {
						nabu.utils.arrays.merge(promises, editorPromises);
					}
					self.scanPagesForTemplates();
				}
				else {
					self.removeEditIcon();
				}
				if (self.canTest()) {
					// this call can take long (lots of I/O to be done)
					// so we don't include it in the blocking promises array
					// loading this does not change the application, it simply gives the tester more options in case he specifically wants to test features (which is very rare)
					self.$services.swagger.execute("nabu.web.page.core.v2.rest.feature.get").then(function(features) {
						if (features) {
							if (features.enabled) {
								nabu.utils.arrays.merge(self.availableFeatures,
									features.enabled.map(function(x) { x.enabled = true; return x }));
								// not all enabled features might be in enabledFeatures, as that only looks at web application features, not broader ones
								features.enabled.forEach(function(x) {
									if (self.enabledFeatures.indexOf(x.name) < 0) {
										self.enabledFeatures.push(x.name);
									}
								});
							}
							if (features.disabled) {
								nabu.utils.arrays.merge(self.availableFeatures,
									features.disabled.map(function(x) { x.enabled = false; return x }));
							}
						}
					});
				}
				if (self.applicationState) {
					self.applicationState.forEach(function(state) {
						if (state.name) {
							promises.push(self.$services.swagger.execute(state.operation).then(function(result) {
								Vue.set(self.variables, state.name, result);
							}));
						}
					});
				}
				self.$services.q.all(promises).then(function() {
					Vue.nextTick(function() {
						self.loading = false;
					});
					if (self.canEdit()) {
						// start reloading the css at fixed intervals to pull in any relevant changes
						setTimeout(self.reloadCss, 10000);
					}
					done();
				}, function(error) {
					var route = "error";
					error.forEach(function(x) {
						if (x && (x.status == 503 || x.status == 502)) {
							route = "offline";
						}
					});
					Vue.nextTick(function(e) {
						self.loading = false;
						// route to error once the services are done initializing
						setTimeout(function() {
							self.$services.router.route(route, null, null, route == "offline");
						}, 1);
					});
					if (self.canEdit()) {
						// start reloading the css at fixed intervals to pull in any relevant changes
						setTimeout(self.reloadCss, 10000);
					}
					done();
				});
			});
		},
		removeEditIcon: function() {
			var icon = document.getElementById("page-edit-icon");
			if (icon) {
				icon.parentNode.removeChild(icon);
			}
		},
		injectEditIcon: function() {
			var div = document.createElement("div");
			div.setAttribute("id", "page-edit-icon");
			div.setAttribute("class", "is-column has-tooltip");
			div.setAttribute("style", "position: fixed; bottom: 1rem; left: 1rem; z-index: 10000;");
			var button = document.createElement("button");
			div.appendChild(button);
			//button.setAttribute("class", "is-button is-border-radius-xxlarge is-variant-warning");
			button.setAttribute("style", "padding: 0.7rem; border-radius: 50px; background-color: #fff; border: solid 1px #666; cursor: pointer")
			button.innerHTML = "<img src='" + application.configuration.root + "resources/images/helper/edit.svg' style='width: 1rem' />";
			document.body.appendChild(div);
			var self = this;
			
			var tooltip = document.createElement("span");
			tooltip.setAttribute("class", "is-tooltip is-wrap-none");
			tooltip.innerHTML = "Show rendered pages <span class='shortkey is-badge'>" + (navigator.platform.toLowerCase().indexOf("mac") >= 0 ? "CMD" : "CTRL") + "+ALT+X</span>";
			div.appendChild(tooltip);
			
			var pages = document.createElement("div");
			pages.setAttribute("style", "position: absolute; bottom: 100%; left: 0;");
			//pages.style.display = "none";
			div.appendChild(pages);
			var showPages = function() {
				div.removeChild(tooltip);
				nabu.utils.elements.clear(pages);
				var button = document.createElement("button");
				button.setAttribute("style", "background-color: #333; color: #fff; white-space:nowrap; border: none; padding: 0.7rem; border: solid 1px #333; margin-bottom: 0.3rem; border-radius: 10px; cursor: pointer; display: flex;");
				button.innerHTML = "View all pages";
				pages.appendChild(button);
				button.onclick = function() {
					self.$services.router.route("pages");
				};
				var availablePages = [];
				Object.keys(nabu.page.instances).forEach(function(key) {
					var page = nabu.page.instances[key].page;
					if (!page.content.readOnly && availablePages.indexOf(page) < 0) {
						availablePages.push(page);
					}
				});
				availablePages.sort(function(a, b) {
					return a.content.name.localeCompare(b.content.name);
				});
				availablePages.forEach(function(x) {
					var button = document.createElement("button");
					button.setAttribute("style", "background-color: #fff; border: none; white-space: nowrap; padding: 0.7rem; border: solid 1px #666; margin-bottom: 0.3rem; border-radius: 10px; cursor: pointer; display: flex; column-gap: 0.7rem; align-items: center");
					var span = document.createElement("span");
					span.innerHTML = x.content.label ? x.content.label : x.content.name;
					button.appendChild(span);
					var img = document.createElement("img");
					img.setAttribute("src", application.configuration.root + "resources/images/helper/search.svg");
					img.setAttribute("style", "width: 0.7rem");
					img.setAttribute("title", "Inspect state");
					button.appendChild(img);
					img.onclick = function(event) {
						var reported = [];
						Object.keys(nabu.page.instances).forEach(function(key) {
							if (x == nabu.page.instances[key].page && reported.indexOf(nabu.page.instances[key]) < 0) {
								reported.push(nabu.page.instances[key]);
								console.log("Page: " + x.content.name, nabu.page.instances[key].variables, nabu.page.instances[key]);
							}
						});
						event.stopPropagation();
					}
					pages.appendChild(button);
					// we just edit the first instance of the page we find
					button.onclick = function(event) {
						var found = false;
						Object.keys(nabu.page.instances).forEach(function(key) {
							if (!found && x == nabu.page.instances[key].page) {
								found = true;
								nabu.page.instances[key].goIntoEdit();
							}
						});
					}
				})
			}
			button.onclick = function(event) {
				if (pages.firstChild) {
					div.appendChild(tooltip);
					nabu.utils.elements.clear(pages);	
				}
				else {
					showPages();
					event.stopPropagation();
				}
			};
			// make sure it closes when you click somewhere
			document.addEventListener("click", function() {
				if (pages.firstChild) {
					div.appendChild(tooltip);
					nabu.utils.elements.clear(pages);
				}
			});
			// add the same shortkey as before to open it
			document.addEventListener("keydown", function(event) {
				if ((event.ctrlKey || event.metaKey) && event.altKey && event.keyCode == 88) {
					if (self.canEdit()) {
						if (pages.firstChild) {
							div.appendChild(tooltip);
							nabu.utils.elements.clear(pages);	
						}
						else {
							showPages();
						}
					}
					else {
						self.$services.router.route("login", null, null, true);
					}
				}
			});
		},
		// we can do inline templates in pages
		scanPagesForTemplates: function() {
			var self = this;
			this.pages.forEach(function(page) {
				// the marker to even start checking
				if (page.content.hasTemplates) {
					var check = function(target) {
						if (target.rows) {
							target.rows.forEach(function(x) {
								if (x.isTemplate) {
									if (x.templateStable) {
										var existing = self.templates.filter(function(y) {
											return y.id == x.templateId;
										})[0];
										if (existing) {
											self.templates.splice(self.templates.indexOf(existing), 1);
										}
										self.templates.push({
											id: x.templateId,
											version: x.release,
											type: "row",
											templateVersion: x.templateVersion,
											category: x.templateCategory ? x.templateCategory : page.content.name,
											name: x.templateTitle,
											description: x.templateDescription,
											icon: x.templateIcon ? x.templateIcon : "align-justify",
											content: JSON.stringify({
												type: "page-row",
												content: x.templateStable
											})
										})
									}
								}
								// only recursively check if we are not already in a template
								else if (x.cells) {
									check(x);
								}
							});
						}
						if (target.cells) {
							target.cells.forEach(function(x) {
								if (x.isTemplate) {
									if (x.templateStable) {
										var existing = self.templates.filter(function(y) {
											return y.id == x.templateId;
										})[0];
										if (existing) {
											self.templates.splice(self.templates.indexOf(existing), 1);
										}
										self.templates.push({
											id: x.templateId,
											version: x.release,
											type: "cell",
											templateVersion: x.templateVersion,
											category: x.templateCategory ? x.templateCategory : page.content.name,
											name: x.templateTitle,
											description: x.templateDescription,
											icon: x.templateIcon ? x.templateIcon : "align-justify",
											content: JSON.stringify({
												type: "page-cell",
												content: x.templateStable
											})
										})
									}
								}
								else if (x.rows) {
									check(x);
								}
							});
						}
					}
					check(page.content);
				}
			})
		},
		ensureDevices: function() {
			var self = this;
			var ensure = function(name, width) {
				var device = self.devices.filter(function(x) { return x.name == name})[0];
				if (device == null) {
					self.devices.push({
						name: name,
						width: width
					});
				}
				else if (device.width == null) {
					device.width = width;
				}
			}
			// we don't _need_ to set the device widths, we need to make sure the devices exist so you can choose them
			// the placeholder in the edit screen visualizes the default without hard saving it to your application
			// the default itself is set in the breakpoint injector
			ensure("phone", null); // 512
			ensure("tablet", null);	// 960
			ensure("desktop", null); // 1280
			ensure("wide", null); // 2560
		},
		getApplicationStateNames: function(value) {
			var values = this.applicationState.filter(function(x) { return !!x.name }).map(function(x) {
				return x.name;
			});
			if (value) {
				values = values.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				})
			}
			return values;
		},
		reloadState: function(name) {
			var state = this.applicationState.filter(function(x) {
				return x.name == name;
			})[0];
			if (state && state.operation) {
				var self = this;
				return this.$services.swagger.execute(state.operation).then(function(result) {
					Vue.set(self.variables, state.name, result);
				});
			}
			else {
				return this.$services.q.reject();
			}
		},
		renumber: function(page, entity, mapping) {
			var initial = false;
			if (!mapping) {
				mapping = {};
				initial = true;
			}
			var self = this;
			if (entity.id) {
				var oldId = entity.id;
				entity.id = page.content.counter++;
				mapping[oldId] = entity.id;
			}
			if (entity.rows) {
				entity.rows.map(function(row) {
					self.renumber(page, row, mapping);
				});
			}
			if (entity.cells) {
				entity.cells.map(function(cell) {
					self.renumber(page, cell, mapping);
				});
			}
			if (initial) {
				var renumberInternally = function(target) {
					if (target.renderer) {
						var renumberProvider = nabu.page.providers("page-renumberer").filter(function(x) {
							return x.renderer == target.renderer;
						})[0];
						if (renumberProvider) {
							renumberProvider.renumber(target, mapping);
						}
					}
					if (target.alias) {
						var renumberProvider = nabu.page.providers("page-renumberer").filter(function(x) {
							return x.component == target.alias;
						})[0];
						if (renumberProvider) {
							renumberProvider.renumber(target, mapping);
						}
					}
					if (target.cells) {
						target.cells.forEach(renumberInternally);
					}
					if (target.rows) {
						target.rows.forEach(renumberInternally);
					}
				}
				renumberInternally(entity, mapping);
				return entity;
			}
			else {
				return mapping;
			}
		},
		getGlobalEvents: function() {
			var events = {};
			this.pages.map(function(page) {
				if (page.content.globalEvents) {
					page.content.globalEvents.map(function(event) {
						var globalName = event.globalName ? event.globalName : event.localName;
						if (globalName != null) {
							if (events[globalName] == null) {
								var properties = event.properties;
								// if we have an instance of it, we can resolve the definition "realtime"
								// for some reason this definition is sometimes wrong. it is also not in sync with the definition in json which (while outdated) is what we would expect
								// we disable this for now as the usecases are too limited to draw any conclusions
								//if (nabu.page.instances[page.content.name]) {
								//	properties = nabu.page.instances[page.content.name].getEvents()[event.localName];
								//}
								events[globalName] = properties == null ? {properties:{}} : properties;
							}
						}
					});
				}
			});
			return events;
		},
		// push global events to all pages
		emit: function(event, data, source) {
			var instances = [];
			// make sure we don't emit it again to the source page
			if (source != null) {
				instances.push(source);
			}
			Object.keys(nabu.page.instances).map(function(key) {
				var instance = nabu.page.instances[key];
				if (instances.indexOf(instance) < 0) {
					if (instance.page.content.globalEventSubscriptions) {
						var globalEvent = instance.page.content.globalEventSubscriptions.filter(function(x) {
							return x.globalName == event;
						})[0];
						if (globalEvent) {
							instance.emit(globalEvent.localName != null ? globalEvent.localName : event, data);
						}
					}
					instances.push(instance);
				}
			});
		},
		getCurrentInstance: function(component) {
			var page = null;
			while (!page && component) {
				if (component.page) {
					page = component.page;
				}
				else {
					component = component.$parent;
				}
			}
			return page ? this.getPageInstance(page, component) : null;
		},
		getPageInstanceByName: function(pageName, component) {
			var page = this.pages.filter(function(x) {
				return x.content.name == pageName;
			})[0];
			return page ? this.getPageInstance(page, component) : null;
		},
		getParentInstance: function(pageInstance) {
			var instance = pageInstance;
			while (instance && instance.$parent) {
				instance = instance.$parent;
				if (instance.page && instance.page != pageInstance.page) {
					return this.getPageInstance(instance.page, instance);
				}
			}
			return null;
		},
		getParentPageInstance: function(page, component) {
			var currentInstance = this.getPageInstance(page, component);
			var parentInstance = null;
			// let's check through the parents
			while (!parentInstance && currentInstance && currentInstance.$parent) {
				currentInstance = currentInstance.$parent;
				if (currentInstance.page) {
					parentInstance = this.getPageInstance(currentInstance.page, currentInstance);
				}
			}
			return parentInstance;
		},
		getDraggables: function() {
			var result = {};
			var self = this;
			Object.keys(nabu.page.instances).forEach(function(key) {
				var draggables = nabu.page.instances[key].getDraggables();
				Object.keys(draggables).forEach(function(draggable) {
					result[draggable] = draggables[draggable];
				});
			});
			return result;
		},
		getDraggableKeys: function(value) {
			return Object.keys(this.getDraggables(value)).filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getPageInstance: function(page, component) {
			var pageInstance = null;
			if (component && component.pageInstanceId != null) {
				pageInstance = nabu.page.instances[page.name + "." + component.pageInstanceId];
			}
			else if (component && component.$parent) {
				var parent = component.$parent;
				while (parent != null && parent.pageInstanceId == null) {
					parent = parent.$parent;
				}
				if (parent && parent.pageInstanceId != null) {
					pageInstance = nabu.page.instances[page.name + "." + parent.pageInstanceId];	
				}
			}
			if (!pageInstance && component && component.$root && component.$root.pageInstanceId != null) {
				pageInstance = nabu.page.instances[page.name + "." + component.$root.pageInstanceId];
			}
			return pageInstance ? pageInstance : nabu.page.instances[typeof(page) == "string" ? page : page.name];
		},
		setPageInstance: function(page, instance) {
			nabu.page.instances[page.name] = instance;
			if (instance.pageInstanceId != null) {
				nabu.page.instances[page.name + "." + instance.pageInstanceId] = instance;	
			}
		},
		destroyPageInstance: function(page, instance) {
			if (instance.pageInstanceId != null) {
				delete nabu.page.instances[page.name + "." + instance.pageInstanceId];
			}
			if (nabu.page.instances[page.name] == instance) {
				delete nabu.page.instances[page.name];
			}
		},
		// this may no longer be in use, there was a call from the page instance to this which reverted to the page instance, this has been optimized away
		// it is not clear if anyone else is using it atm, so it now points to the page method call
		destroy: function(component) {
			if (component.page && component.cell) {
				var pageInstance = this.$services.page.getPageInstance(component.page, component);
				//Vue.delete(pageInstance.components, component.cell.id, null);
				pageInstance.destroyComponent(component, component.cell);
			}
		},
		reloadSwagger: function() {
			if (!this.disableReload) {
				return this.$services.swagger.$clear();
			}
		},
		reloadCss: function() {
			this.reloadSwagger();
			var self = this;
			if (!self.disableReload) {
				nabu.utils.ajax({url:"${nabu.web.application.Services.fragment(environment('webApplicationId'), 'nabu.web.page.core.v2.component')/fragment/path}page/css-modified"}).then(function(response) {
					if (response.responseText != null && !self.disableReload) {
						var date = new Date(response.responseText);
						if (!self.cssLastModified) {
							self.cssLastModified = date;
						}
						else if (date.getTime() > self.cssLastModified.getTime()) {
							// actually reload
							var links = document.head.getElementsByTagName("link");
							for (var i = 0; i < links.length; i++) {
								var original = links[i].getAttribute("original");
								if (!original) {
									original = links[i].href;
									links[i].setAttribute("original", original);
								}
								links[i].setAttribute("href", original + "&loadTime=" + date.getTime());
							}
							self.cssLastModified = date;
						}
					}
					setTimeout(self.reloadCss, 5000);
				});
			}
			else {
				setTimeout(self.reloadCss, 5000);
			}
		},
		getFunctionDefinition: function(id) {
			return this.listFunctionDefinitions().filter(function(x) { return x.id == id })[0];
		},
		getRunnableFunction: function(id) {
			var parts = id.split(".");
			var target = window;
			for (var i = 0; i < parts.length - 1; i++) {
				if (!target[parts[i]]) {
					target = null;
					break;
				}
				target = target[parts[i]];
			}
			var func = target == null ? null : target[parts[parts.length - 1]];	
			// if we didn't find a custom function, check provided ones
			if (!func) {
				var result = nabu.page.providers("page-function").filter(function(x) {
					return x.id == id;
				})[0];
				if (result) {
					func = result.implementation;
				}
			}
			return func;
		},
		runFunction: function(func, input, context, promise) {
			var definition = null;
			if (typeof(func) == "string") {
				definition = this.getFunctionDefinition(func);
				var id = func;
				func = this.getRunnableFunction(id);
				if (!func) {
					throw "Could not find function: " + id;
				}
			}
			var resolve = function(result) {
				if (promise) {
					promise.resolve(result);
				}
			};
			var reject = function(result) {
				if (result.responseText) {
					result = JSON.parse(result.responseText);
				}
				if (promise) {
					promise.reject(result);
				}
			};
			try {
				var returnValue = func(input, this.$services, context && context.$value ? context.$value : function() {}, resolve, reject);
				// if not async, call the done yourself
				if (definition && !definition.async) {
					resolve(returnValue);
				}
				return returnValue == null ? promise : returnValue;
			}
			catch (exception) {
				reject(exception);
				throw exception;
			}
		},
		getBindingValue: function(pageInstance, bindingValue, context, customValueFunction) {
			var self = this;
			if (bindingValue && bindingValue.label) {
				if (bindingValue.label == "fixed") {
					return bindingValue.value;
				}
				else if (bindingValue.label == "$function") {
					/*
					var parts = bindingValue.value.split(".");
					var target = window;
					for (var i = 0; i < parts.length - 1; i++) {
						if (!target[parts[i]]) {
							throw "Could not find function: " + bindingValue.value;
						}
						target = target[parts[i]];
					}
					var func = target[parts[parts.length - 1]];
					*/
					
					var func = this.getRunnableFunction(bindingValue.value);
					if (!func) {
							throw "Could not find function: " + bindingValue.value;
					}
					if (bindingValue.lambda) {
						return function() {
							var def = self.getFunctionDefinition(bindingValue.value);
							var input = {};
							// we map the bindings we have a value for
							if (bindingValue.bindings) {
								Object.keys(bindingValue.bindings).forEach(function(key) {
									if (bindingValue.bindings[key]) {
										var value = self.getBindingValue(pageInstance, bindingValue.bindings[key], context);
										self.setValue(input, key, value);
									}
								});
							}
							if (def.inputs) {
								var tmp = arguments;
								var counter = 0;
								def.inputs.forEach(function(x, i) {
									if (!bindingValue.bindings[x.name]) {
										input[x.name] = tmp[counter++];
									}
								});
							}
							if (def.async) {
								var promise = self.$services.q.defer();
								var promiseToReturn = promise;
								if (bindingValue.output) {
									promiseToReturn = self.$services.q.defer();
									promise.then(function(result) {
										promiseToReturn.resolve(result ? result[bindingValue.output] : result);
									}, promise);
								}
								self.runFunction(func, input, context, promise);
								return promiseToReturn;
							}
							else {
								var output = self.runFunction(func, input, context);
								if (bindingValue.output) {
									output = output[bindingValue.output];
								}
								return output;
							}
						}
					}
					var input = {};
					var self = this;
					if (bindingValue.bindings) {
						Object.keys(bindingValue.bindings).forEach(function(key) {
							if (bindingValue.bindings[key]) {
								var value = self.getBindingValue(pageInstance, bindingValue.bindings[key], context);
								self.setValue(input, key, value);
							}
						});
					}
					//var result = func(input, this.$services);
					var result = this.runFunction(func, input, context);
					if (bindingValue.output) {
						return this.getValue(result, bindingValue.output);
					}
					else {
						return result;
					}
				}
			}
			
			if (bindingValue == null) {
				return null;
			}
			var enumerators = this.enumerators;
			// allow for fixed values
			// for the longest time we did not use the value function here
			// the default value function itself also actually uses the getBindingValue so we need to be careful here
			// however the default value does not pass in a value function, so the iteration stops there
			// the primary usecase is that some contexts have more information (like the repeat, triggers,...) regarding certain state
			// when we want to bind that state, it might not work otherwise
			var value = bindingValue.indexOf("fixed") == 0 ? this.translate(bindingValue.substring("fixed.".length)) : (customValueFunction ? customValueFunction(bindingValue) : (pageInstance ? pageInstance.get(bindingValue) : null));
			// if we have a fixed value that starts with a "=", interpret it
			if (bindingValue.indexOf("fixed.=") == 0) {
				value = this.interpret(value, pageInstance, null, customValueFunction);
			}
			var key = bindingValue.split(".")[0];
			// allow for enumerated values, if there is a provider with that name, check it
			if (!value && enumerators[key]) {
				var label = bindingValue.substring(key.length + 1);
				var enumeration = enumerators[key].enumerate().filter(function(x) {
					return enumerators[key].label ? x[enumerators[key].label] == label : x == label;
				})[0];
				if (enumeration != null && typeof(enumeration) != "undefined") {
					value = enumerators[key].value ? enumeration[enumerators[key].value] : enumeration;
				}
			}
			// let's check parent contexts
			if (value == null && context != null) {
				while (context) {
					if (context.getCellValue) {
						var localResult = context.getCellValue(bindingValue);
						if (localResult != null) {
							value = localResult;
							break;
						}
					}
					context = context.$parent;
				}
			}
			// if the page is a fragment of another page, check that parent one
			if (value == null && pageInstance && pageInstance.fragmentParent) {
				value = this.getBindingValue(pageInstance.fragmentParent, bindingValue, context);
			}
			return value;
		},
		translateErrorCode: function(value, defaultValue) {
			// if you have a standardized translator service available
			if (this.$services.translator && this.$services.translator.translate) {
				return this.$services.translator.translate("%" + "{" + value + "}", defaultValue ? defaultValue : this.$services.translator.translate("%" + "{An error has occurred while trying to complete your action}"));
			}
			else {
				var translations = !value ? [] : this.translations.filter(function(x) {
					// this is not actually a translation, fall back to defaults
					if (x.translation == x.name) {
						return false;
					}
					if (value.toLowerCase() == x.name.toLowerCase()) {
						return true;
					}
					else {
						// if we try to cast something to a regex that is not meant as a regex, it may error out
						// we don't care at that point, just ignore it
						// the backend already allows for generalization through regex, not sure if this is necessary in the translations
						// might also require for example that a * is present before actually attempting this?
						try {
							return value.match(new RegExp(x.name.replace(/\*/g, ".*")));
						}
						catch (exception) {
							// not a regex!
						}
					}
					return false;
				});
				var translation = null;
				if (translations.length > 1) {
					translations.forEach(function(x) {
						if (translation == null || translation.name.length < x.name.length)	 {
							translation = x;
						}
					});
				}
				else if (translations.length == 1) {
					translation = translations[0];
				}
				return translation && translation.translation 
					? translation.translation 
					: (defaultValue ? defaultValue : "%{An error has occurred while trying to complete your action}");
			}
		},
		translate: function(value, component) {
			if (this.showRawTranslations) {
				return value;
			}
			// if you have a standardized translator service available
			if (this.$services.translator && this.$services.translator.translate) {
				return this.$services.translator.translate(value);
			}
			// otherwise we do best effort local translations, but that requires that someone pushed translations to this
			// in v1, page builder was itself responsible for loading translations but that is no longer the case
			if (value && value.indexOf) {
				while (value.indexOf("%" + "{") >= 0) {
					var start = value.indexOf("%" + "{");
					var depth = 1;
					var end = -1;
					for (var j = start + 2; j < value.length; j++) {
						if (value.charAt(j) == "{") {
							depth++;
						}
						else if (value.charAt(j) == "}") {
							depth--;
							if (depth == 0) {
								end = j;
								break;
							}
						}
					}
					// no end tag
					if (end < 0) {
						break;
					}
					var available = value.substring(start + 2, end);
					var parts = available.split("::");
					var translation = this.translations.filter(function(x) {
						return ((parts.length == 1 && x.context == null)
								|| (parts.length == 2 && x.context == parts[0]))
							&& (x.name == (parts.length == 1 ? parts[0] : parts[1]));
					})[0];
					value = value.substring(0, start) + (translation && translation.translation ? translation.translation : (parts.length == 1 ? parts[0] : parts[1])) + value.substring(end + 1);
				}
			}
			return value;
		},
		interpret: function(value, component, state, customValueFunction) {
			if (typeof(value) == "string" && value.length > 0 && value.substring(0, 1) == "=") {
				value = value.substring(1);
				var result = null;
				if (state) {
					result = this.eval(value, state, component, customValueFunction);
				}
				else if (component) {
					var stateOwner = component;
					while (!stateOwner.localState && stateOwner.$parent) {
						stateOwner = stateOwner.$parent;
					}
					if (stateOwner && stateOwner.localState) {
						result = this.eval(value, stateOwner.localState, component, customValueFunction);
					}
					if (result == null && stateOwner && stateOwner.state) {
						result = this.eval(value, stateOwner.state, component, customValueFunction);
					}
					if (result == null && component.page) {
						var pageInstance = this.getPageInstance(component.page, component);
						// the whole "state" thing is deprecated, there is only page state
						//result = this.getBindingValue(pageInstance, value);
						result = this.eval(value, pageInstance.variables, component, customValueFunction);
					}
				}
				else {
					result = this.eval(value, {}, component, customValueFunction);
				}
				value = result;
			}
			if (typeof(value) == "string") {
				var changed = true;
				while (changed) {
					changed = false;
					var index = value.indexOf("{{");
					if (index >= 0) {
						var end = value.indexOf("}}", index);
						if (end >= index) {
							var rule = value.substring(index + 2, end);
							var result = null;
							if (state) {
								result = this.eval(rule, state, component, customValueFunction);
							}
							else if (component) {
								var stateOwner = component;
								while (!stateOwner.localState && stateOwner.$parent) {
									stateOwner = stateOwner.$parent;
								}
								if (stateOwner && stateOwner.localState) {
									result = this.eval(rule, stateOwner.localState, component, customValueFunction);
								}
								if (result == null && stateOwner && stateOwner.state) {
									result = this.eval(rule, stateOwner.state, component, customValueFunction);
								}
								if (result == null && component.page) {
									var pageInstance = this.getPageInstance(component.page, component);
									result = this.getBindingValue(pageInstance, rule);
								}
							}
							// when loading variables in the initial things like api keys in imports
							// there is no component yet
							// you can basically only use application level variables then
							else if (rule.trim().indexOf("application.") == 0) {
								var variable = rule.trim().substring("application.".length);
								variable = this.properties.filter(function(x) { return x.key == variable })[0];
								result = variable ? variable.value : null;
							}
							value = value.substring(0, index) + (result == null ? "" : result) + value.substring(end + 2);
							changed = true;
						}
					}
				}
			}
			return value;
		},
		getValue: function(data, field) {
			if (field) {
				if (data && data.hasOwnProperty(field)) {
					return data[field];
				}
				var parts = field.split(".");
				var value = data;
				parts.forEach(function(part) {
					// skip $all, you just want the entire value
					if (value && part != "$all") {
						value = value[part];
					}
				});
				return value;
			}
			return null;
		},
		setValue: function(data, field, value) {
			var tmp = data;
			var parts = field.split(".");
			for (var i = 0; i < parts.length - 1; i++) {
				if (parts[i] == "$all") {
					continue;
				}
				if (!tmp[parts[i]]) {
					// if it does not exist and we are trying to set null, leave it
					if (value == null) {
						return;
					}
					Vue.set(tmp, parts[i], {});
				}
				tmp = tmp[parts[i]];
			}
			Vue.set(tmp, parts[parts.length - 1], value);
		},
		getInputBindings: function(operation) {
			var self = this;
			var bindings = {};
			if (typeof(operation) == "string") {
				operation = this.$services.swagger.operations[operation];
			}
			if (operation && operation.parameters) {
				var self = this;
				operation.parameters.map(function(parameter) {
					if (parameter.in == "body") {
						var type = self.$services.swagger.resolve(parameter);
						if (type.schema.properties) {
							Object.keys(type.schema.properties).map(function(key) {
								// 1-level recursion (currently)
								// always add the element itself if it is a list (need to be able to add/remove it)
								if (type.schema.properties[key].type != "object") {
									var newKey = "body." + key;
									bindings[newKey] = null;
								}
								if (type.schema.properties[key].type == "object" || type.schema.properties[key].type == "array") {
									var properties = type.schema.properties[key].type == "array" ? type.schema.properties[key].items.properties : type.schema.properties[key].properties;
									Object.keys(properties).map(function(key2) {
										var newKey = "body." + key + "." + key2;
										bindings[newKey] = null;	
									});
								}
							});
						}
					}
					else {
						bindings[parameter.name] = null;
					}
				});
			}
			return bindings;
		},
		filterOperations: function(value, accept) {
			return this.getOperations(accept).filter(function(x) {
				return !value || x.id.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getOperations: function(accept) {
			var result = [];
			var operations = this.$services.swagger.operations;
			Object.keys(operations).map(function(operationId) {
				var shouldAccept = accept == null
					|| (accept instanceof Function && accept(operations[operationId]))
					|| (accept.toLowerCase && operationId.toLowerCase().indexOf(accept.toLowerCase()) >= 0);
				if (shouldAccept) {
					result.push(operations[operationId]);
				}
			});
			result.sort(function(a, b) {
				return a.id.localeCompare(b.id);
			});
			return result;
		},
		// operations allowed in a trigger are both get and modify, but not downloads
		getTriggerOperations: function(value) {
			return this.getOperations(function(operation) {
				return operation && (!operation.produces || !operation.produces.length || operation.produces.indexOf("application/octet-stream") < 0)
					&& (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
		},
		// operations that can be used to update state in the backend
		getModifyOperations: function(value) {
			// must not be a get
			return this.getOperations(function(operation) {
				return operation && operation.method != "get"
					&& (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
		},
		// operations where you can download a binary blob
		// download operations can also download records in csv format etc
		getBinaryOperations: function(value) {
			return this.getOperations(function(operation) {
				var binaryDownload = operation && operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream"
					&& (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0);
				return binaryDownload;
			});			
		},
		// operations where you can download data
		getDownloadOperations: function(value) {
			return this.getOperations(function(operation) {
				var binaryDownload = operation && operation.method == "get" && operation.produces && operation.produces.length && operation.produces[0] == "application/octet-stream";
				var regularDownload = operation && operation["x-downloadable"] == "true";
				return (binaryDownload || regularDownload) && (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
		},
		getUploadOperations: function(value) {
			return this.getOperations(function(operation) {
				var binaryUpload = operation && operation.method != "get" && operation.consumes && operation.consumes.length && operation.consumes[0] == "application/octet-stream";
				return binaryUpload && (!value || operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
		},
		// operations where you can retrieve state (e.g. for initial state) from the backend
		getStateOperations: function(value) {
			var self = this;
			return Object.keys(this.$services.swagger.operations).filter(function(operationId) {
				if (value && operationId.toLowerCase().indexOf(value.toLowerCase()) < 0) {
					return false;
				}
				var operation = self.$services.swagger.operations[operationId];
				// must be a get
				return operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
			});
		},
		// all operations that return an array of some sort
		getArrayOperations: function(value) {
			var self = this;
			return this.getOperations(function(operation) {
				// must be a get
				var isAllowed = operation.method.toLowerCase() == "get"
					// and contain the name fragment (if any)
					&& (!name || operation.id.toLowerCase().indexOf(name.toLowerCase()) >= 0)
					// must have _a_ response
					&& operation.responses["200"];
				// we also need at least _a_ complex array in the results
				if (isAllowed && operation.responses["200"] != null && operation.responses["200"].schema != null) {
					var schema = operation.responses["200"].schema;
					if (!schema["$ref"]) {
						isAllowed = false;
					}
					else {
						var definition = self.$services.swagger.resolve(schema["$ref"]);
						isAllowed = self.$services.page.getArrays(definition).length > 0;
					}
				}
				if (isAllowed && value) {
					isAllowed = operation.id.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				}
				return isAllowed;
			});
		},
		getPageVariables: function(page, value) {
			var variables = this.getSimpleKeysFor({properties:this.getAllAvailableParameters(page, null, true)});
			if (value) {
				variables = variables.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return variables;
		},
		getSimpleClasses: function(value) {
			var classes = ["primary", "secondary", "info", "success", "warning", "danger", "inline"];
			if (value) {
				classes = classes.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			// the class itself is allowed
			if (classes.indexOf(value) < 0) {
				classes.push(value);
			}
			return classes;
		},
		getDynamicVariables: function(styleVariables, state, instance) {
			if (!styleVariables) {
				return [];
			}
			var self = this;
			return styleVariables.filter(function(style) {
				return !style.condition || self.isCondition(style.condition, state, instance);
			}).map(function(style) {
				return {
					name: style.name,
					value: self.$services.page.interpret(style.rule, instance, state)
				};
			});
		},
		getDynamicClasses: function(styles, state, instance) {
			if (!styles) {
				return [];
			}
			var self = this;
			return styles.filter(function(style) {
				return self.isCondition(style.condition, state, instance);
			}).map(function(style) {
				return self.$services.page.interpret(style.class, instance, state);
			});
		},
		getRestrictedParameters: function() {
			// component is mostly for page-arbitrary
			return ["page", "cell", "edit", "component", "parameters", "localState"];
		},
		getPageParameterValues: function(page, pageInstance) {
			// copy things like query parameters & path parameters
			var result = pageInstance.variables ? nabu.utils.objects.clone(pageInstance.variables) : {};
			// copy internal parameters as well
			if (pageInstance.parameters) {
				//var parameters = this.getPageParameters(page).properties;
/*				Object.keys(parameters).forEach(function(key) {
					if (pageInstance.parameters[key] != null) {
						result[key] = pageInstance.parameters[key];
					}
				});*/
				var restricted = this.getRestrictedParameters();
				Object.keys(pageInstance.parameters).filter(function(x) { return restricted.indexOf(x) < 0 }).forEach(function(key) {
					// runtime values in variables take precedence over static input parameters!
					if (pageInstance.parameters[key] != null && !result.hasOwnProperty(key)) {
						result[key] = pageInstance.parameters[key];
					}
				});
			}
			return result;
		},
		isCondition: function(condition, state, instance, customValueFunction, defaultValue) {
			if (!condition) {
				return true;
			}
			try {
				var result = this.eval(condition, state, instance, customValueFunction);
				// if we get a promise, return false initially, update to true if possible
				if (result && result.then) {
					var instanceId = instance.conditionId;
					if (!instanceId) {
						instance.conditionId = crypto.randomUUID();
					}
					var key = instanceId + "::" + condition;
					if (!this.conditionalResults.hasOwnProperty(key)) {
						Vue.set(this.conditionalResults, key, defaultValue == null ? false : defaultValue);
					}
					var self = this;
					result.then(function(result) {
						// if you have no result, we assume (because resolve instead of reject) that it was successful
						// you can also pass in an explicit value that is cast to boolean to determine whether or not it was successful
						// we don't update it if it stays the same to prevent update loops (boolean changes, triggers rerender, boolean is updated again even though the same, rerender etc)
						var booleanValue = result == null || !!result;
						if (booleanValue !== self.conditionalResults[key]) {
							Vue.set(self.conditionalResults, key, booleanValue);
						}
					});
					return this.conditionalResults[key];
				}
				return !!result;
			}
			catch (exception) {
				console.error("Could not evaluate condition", condition, exception);
				return false;
			}
		},
		// you can pass in a schema that has to be enriched
		getSchemaFromObject: function(object, schema) {
			var self = this;
			if (schema == null) {
				schema = {};
			}
			if (typeof(object) === "string" || object instanceof String) {
				schema.type = "string";
			}
			else if (object instanceof Date) {
				schema.type = "string";
				schema.format = "date-time";
			}
			else if (typeof(object) === "number" || object instanceof Number) {
				schema.type = "int64";
			}
			else if (typeof(object) === "boolean" || object instanceof Boolean) {
				schema.type = "boolean";
			}
			// we have an array of items, we merge the definitions from each instance in case they don't all have the same fields
			else if (object instanceof Array) {
				var items = {};
				object.forEach(function(instance) {
					self.getSchemaFromObject(instance, items);	
				});
				schema.type = "array";
				schema.items = items;
			}
			// we assume it's an object
			else {
				schema.type = "object";
				schema.properties = {};
				if (object != null) {
					Object.keys(object).forEach(function(key) {
						schema.properties[key] = self.getSchemaFromObject(object[key]);
					});
				}
			}
			return schema;
		},
		getPageState: function(pageInstance) {
			var state = {};
			// inherit state from above
			if (pageInstance.localState) {
				Object.keys(pageInstance.localState).map(function(key) {
					state[key] = pageInstance.localState[key];
				})
			}
			Object.keys(pageInstance.variables).map(function(key) {
				if (typeof(state[key]) == "undefined") {
					state[key] = pageInstance.variables[key];
				}
			});
			var parameters = pageInstance.parameters ? nabu.utils.objects.clone(pageInstance.parameters) : {};
			Object.keys(parameters).forEach(function(key) {
				var page = {};
				if (parameters[key] != null) {
					page[key] = parameters[key];
				}
				state.page = page;
			});
			// aliased components win, even if their state is null (it has to be predictable)
			// subsumed by variables
/*			Object.keys(pageInstance.components).forEach(function(x) {
				if (x.indexOf("alias_") == 0) {
					var component = pageInstance.components[x];
					state[x.substring("alias_".length)] = component.getState ? component.getState() : null;
				}	
			});*/
			return state;
		},
		hasFeature: function(feature, leadin) {
			// we mostly use this to circumvent compilation optimization
			if (!leading) {
				leadin = "@";
			}
			// remove syntax if applicable
			feature = feature.replace(leadin + "{", "");
			feature = feature.replace("}", "");
			return this.enabledFeatures.indexOf(feature) >= 0;
		},
		evalInContext: function(context, js) {
			if ((!js.match(/^[\s]*function\b.*/)) && (!js.match(/^[\s]*return[\s]+.*/))) {
				js = "return " + js;
			}
			var value;
			try {
				// for statements
				value = (new Function('with(this) { ' + js + ' }')).call(context);
			}
			catch (e) {
				// do nothing
			}
			// during minification the variable "context" is renamed to something else
			// that means the eval always fails at it expects a context variable to be available
			//value = (new Function('with(this) { ' + js + ' }')).call(context);
			//try {
				// for expressions
				//value = eval('with(context) { ' + js + ' }');
			//	value = (new Function('with(this) { ' + js + ' }')).call(context);
			//}
			//catch (e) {
				/*if (e instanceof SyntaxError) {
					try {
						// for statements
						value = (new Function('with(this) { ' + js + ' }')).call(context);
					}
					catch (e) {
						// do nothing
					}
				}*/
			//}
			return value;	
		},
		eval: function(condition, state, instance, customValueFunction, skipFunctionExecution) {
			if (!condition) {
				return null;
			}
			// compilation optimization
			var leadin = condition ? "@" : "@@";
			
			// the vast majority of conditions will not have feature based logic, this optimizes away a loop and regexes
			if (condition.indexOf(leadin) >= 0) {
				// replace all the enabled features with true
				this.enabledFeatures.forEach(function(x) {
					// avoid the regex matcher!
					condition = condition.replace(leadin + "{" + x + "}", "true");
				});
				// replace all the disabled features with false
				condition = condition.replace(/@\{[^}]+\}/gm, "false");
			}
			
			// for a long time, state was meant to incorporate local state from repeats etc, but the use of local state is being reduced, partly because it is not reactive (for anything that is _not_ local) and memory
			// instead we tend to use data-card etc for actual repeats so it does not appear to be necessary anymore?
			// anyway, because of that local state, we often put the data (e.G. for a table) in "record", so you needed to type state.record.myField (to prevent unintentional naming collissions)
			// however, not always, in forms it was directly the form field, for example "state.myField".
			// this made it hard to predict when you needed record and when you didn't, resulting in a lot of trial and error
			// so now, if we see state.record, we will expand the data onto state itself
			// this remains backwards compatible (state.record.myField will keep working) but more predictable going forward (use state.myField)
			if (state) {
				
			}
			
			if (this.useEval) {
				try {
					var result = eval(condition);
				}
				catch (exception) {
					console.warn("Could not evaluate", condition, exception);
					return false;
				}
				if (result instanceof Function) {
					result = result(state);
				}
				return result;
			}
			else {
				try {
					var resultFunction = Function('"use strict";return (function(state, $services, $value, $is, application, value) { return ' + condition + ' })')();
					// by default it is bound to "undefined"
					resultFunction = resultFunction.bind(this);
					var result = resultFunction(state, this.$services, customValueFunction ? customValueFunction : (instance ? instance.$value : function() { throw "No value function" }), instance ? instance.$is : function() { "No is function" }, application, state && state.value ? state.value : state);
					if (result instanceof Function) {
						// by default it is bound to "undefined"
						result = result.bind(this);
						if (!skipFunctionExecution) {
							result = result(state);
						}
					}
				}
				catch (exception) {
					console.error("Could not evaluate", condition, exception);
					return null;
				}
				return result;
			}
			return null;
		},
		classes: function(clazz, value) {
			var result = [];
			var sheets = document.styleSheets;
			for (var l = 0; l < sheets.length; l++) {
				try {
					var rules = sheets.item(l).rules || sheets.item(l).cssRules;
					for (var i = 0; i < rules.length; i++) {
						var rule = rules.item(i);
						if (rule.selectorText) {
							if (rule.selectorText.match(new RegExp(".*\\." + clazz + "\\.([\\w-]+)\\b.*", "g"))) {
								var match = rule.selectorText.replace(new RegExp(".*\\." + clazz + "\\.([\\w-]+)\\b.*", "g"), "$1");
								if (result.indexOf(match) < 0) {
									result.push(match);
								}
							}
						}
					}
				}
				catch (exception) {
					// ignore
				}
			}
			if (value) {
				result = result.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
				// allow the (partial) value itself
				if (result.indexOf(value) < 0) {
					result.push(value);	
				}
			}
			return result;
		},
		getSimpleKeysFor: function(definition, includeComplex, includeArrays, keys, path) {
			var self = this;
			var sort = false;
			if (!keys) {
				keys = [];
				sort = true;
			}
			if (definition && definition.properties) {
				Object.keys(definition.properties).map(function(key) {
					// arrays can not be chosen, you need to bind them first
					// simple arrays are always allowed currently
					if (definition.properties[key] && (definition.properties[key].type != "array" || includeArrays || (definition.properties[key].items && !definition.properties[key].items.properties))) {
						var childPath = (path ? path + "." : "") + key;
						var isArray = definition.properties[key].type == "array";
						var isComplex = !!definition.properties[key].properties;
						// if we have an array, it can be a complex array
						if (!isComplex && definition.properties[key].items) {
							isComplex = !!definition.properties[key].items.properties;
						}
						if (includeComplex || !isComplex) {
							keys.push(childPath);
						}
						// if it is complex, recurse
						if (isComplex) {
							if (isArray) {
								// not sure if the ternary is needed, "definition.properties[key].items" should be correct for complex types
								// but for backwards compatibility i don't want to mess it up
								self.getSimpleKeysFor(definition.properties[key].items.properties ? definition.properties[key].items : {properties:definition.properties[key].items}, includeComplex, includeArrays, keys, childPath);
							}
							else {
								self.getSimpleKeysFor(definition.properties[key], includeComplex, includeArrays, keys, childPath);
							}
						}
					}
				});
			}
			if (sort) {
				keys.sort();
			}
			return keys;
		},
		saveConfiguration: function() {
			var self = this;
			return this.$services.swagger.execute("nabu.web.page.core.v2.rest.configuration.update", {
				body: {
					title: this.title,
					theme: this.theme,
					home: this.home,
					homeUser: this.homeUser,
					users: this.users,
					properties: self.properties,
					environmentProperties: self.environmentProperties,
					devices: self.devices,
					imports: self.imports,
					state: self.applicationState,
					googleSiteVerification: self.googleSiteVerification,
					geoRefusalTimeout: self.geoRefusalTimeout,
					defaultLocale: self.defaultLocale,
					branding: self.branding
				}
			});
		},
		listFunctionDefinitions: function() {
			var result = [];
			nabu.utils.arrays.merge(result, this.functions);
			nabu.utils.arrays.merge(result, nabu.page.providers("page-function"));
			return result;
		},
		listFunctions: function(value) {
			var result = this.listFunctionDefinitions().map(function(x) { return x.id });
			return result.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		},
		getFunctionInput: function(id, value) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			if (!transformer) {
				transformer = nabu.page.providers("page-function").filter(function(x) { return x.id == id })[0];
			}
			var parameters = {};
			var self = this;
			if (transformer && transformer.inputs) {
				transformer.inputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type, null, x.isArray);
					if (!parameters[x.name].required && x.required) {
						parameters[x.name].required = x.required;
					}
				});
			}
			return {properties:parameters};
		},
		hasFunctionOutput: function(id) {
			var output = this.getFunctionOutputFull(id);
			return Object.keys(output.properties).length > 0;
		},
		// really poor naming decisions lead to this...
		getFunctionOutputFull: function(id, value) {
			var transformer = this.$services.page.functions.filter(function(x) { return x.id == id })[0];
			if (!transformer) {
				transformer = nabu.page.providers("page-function").filter(function(x) { return x.id == id })[0];
			}
			var parameters = {};
			var self = this;
			if (transformer && transformer.outputs) {
				transformer.outputs.map(function(x) {
					parameters[x.name] = self.$services.page.getResolvedPageParameterType(x.type, null, x.isArray);
				});
			}
			return {properties:parameters};
		},
		getFunctionOutput: function(id, value) {
			return this.$services.page.getSimpleKeysFor(this.getFunctionOutputFull(id, value), true, true);
		},
		inject: function(link, callback, failure, async) {
			// only inject it once!
			var existing = document.head.querySelector('script[src="' + link + '"]');
			if (existing) {
				if (callback) {
					callback();
				}
			}
			else {
				var script = document.createElement("script");
				script.setAttribute("src", link);
				script.setAttribute("type", "text/javascript");
				if (async) {
					script.setAttribute("async", "true");
				}
				
				if (callback) {
					// IE (not 11)
					if (script.readyState){  
						script.onreadystatechange = function() {
							if (script.readyState == "loaded" || script.readyState == "complete") {
								script.onreadystatechange = null;
								callback();
							}
						};
					}
					// IE 11?
					else if (script.attachEvent) {
						script.attachEvent("onload", function() {
							callback();
						});
						if (failure) {
							script.attachEvent("onerror", function() {
								failure();
							});
						}
					}
					else if (script.addEventListener) {
						script.addEventListener("load", function() {
							callback();
						});
						if (failure) {
							script.addEventListener("error", function() {
								failure();
							});
						}
					}
					// rest
					else { 
						script.onload = function() {
							callback();
						};
					}
				}
				document.head.appendChild(script);
			}
		},
		canEdit: function() {
			return !this.isServerRendering && this.editable;	
		},
		canTest: function() {
			return this.canEdit() || (!this.isServerRendering && this.testable);
		},
		pathParameters: function(url) {
			if (!url) {
				return [];
			}
			var variables = url.match(/\{[\s]*[^}:]+[\s]*(:[\s]*([^}]+)[\s]*|)\}/g);
			return !variables ? [] : variables.map(function(variable) {
				return variable.substring(1, variable.length - 1).replace(/:.*$/, "");
			});
		},
		alias: function(page) {
			return page.name;
		},
		rename: function(page, name) {
			var newName = this.dashify(name);
			// if we actually renamed it...
			if (newName != page.name) {
				newName = this.uniquifyPageName(newName);
				var oldName = page.name;
				page.name = newName;
				page.content.label = name;
				var self = this;
				return this.update(page).then(function() {
					self.removeByName(oldName);
				});
			}
			// you update the label, but it amounts to the same name
			else if (newName == page.name && name != page.content.label) {
				page.content.label = name;
				return this.update(page);
			}
		},
		remove: function(page) {
			var self = this;
			this.removeByName(page.name).then(function() {
				self.pages.splice(self.pages.indexOf(page), 1);
			});
		},
		removeByName: function(name) {
			return this.$services.swagger.execute("nabu.web.page.core.v2.rest.page.delete", {name: name});
		},
		uniquifyPageName: function(pageName) {
			var existing = this.pages.map(function(x) {
				return x.name;
			});
			var tryName = pageName;
			var counter = 1;
			while (existing.indexOf(tryName) >= 0) {
				tryName = pageName + counter;
			}
			return tryName;
		},
		create: function(name, category) {
			var newName = this.uniquifyPageName(this.dashify(name));
			
			var content = this.normalize({
				label: name
			});
			if (category) {
				content.category = category;
			}
			// we automatically add page path, it is usually in sync
			// especially now that we add a default skeleton, this makes it easier
			content.path = "/" + this.dashify(name);
			return this.update({
				name: newName,
				content: content
			});
		},
		update: function(page) {
			var self = this;
			if (!page.content) {
				page.content = self.normalize({});
			}
			page.content.name = page.name;
			
			// we need to calculate aliased components so we know all aliases that exist BEFORE the components are mounted
			// the problem is that we can't dictate the order of mounting, and aliases only become known once they are mounted
			// at that point, already mounted modules may depend on it
			
			
			//page.marshalled = JSON.stringify(page.content, null, "\t");
			page.marshalled = JSON.stringify(page.content);
			return this.$services.swagger.execute("nabu.web.page.core.v2.rest.page.update", { body: page }).then(function() {
				// add it to the pages if it isn't there yet (e.g. create)
				var index = self.pages.indexOf(page);
				// re-add to trigger a reregister (if necessary)
				if (index >= 0) {
					self.pages.splice(index, 1, page);
				}
				else {
					self.pages.push(page);
				}
			});
		},
		findMain: function(rowHolder) {
			if (rowHolder.rows && rowHolder.rows.length) {
				for (var i = 0; i < rowHolder.rows.length; i++) {
					if (rowHolder.rows[i].customId == "main") {
						return rowHolder.rows[i];
					}
					if (rowHolder.rows[i].cells && rowHolder.rows[i].cells.length) {
						for (var j = 0; j < rowHolder.rows[i].cells.length; j++) {
							var cell = rowHolder.rows[i].cells[j];
							if (cell.customId == "main") {
								return cell;
							}
							else if (cell.rows) {
								var main = this.findMain(cell);
								if (main) {
									return main;
								}
							}
						}
					}
				}
			}
			return null;
		},
		filterRoutes: function(value) {
			if (value != null && value.substring(0, 1) == "=") {
				return [value];
			}
			var routes = this.$services.router.list().filter(function(x) {
				return x.alias && (!value || x.alias.toLowerCase().indexOf(value.toLowerCase()) >= 0);
			});
			routes.sort(function(a, b) {
				return a.alias.localeCompare(b.alias);
			});
			return routes.map(function(x) { return x.alias });
		},
		loadFormatters: function(pages) {
			if (!(pages instanceof Array)) {
				pages = [pages];
			}
			var self = this;
			pages.forEach(function(page) {
				if (page.content.formatters && page.content.formatters.length) {
					page.content.formatters.forEach(function(formatter) {
						if (formatter.name && formatter.script) {
							nabu.page.provide("page-format", {
								format: function(value, fragment, page, cell, record, component) {
									var $value = component ? component.$value : null;
									if (!$value) {
										var pageInstance = self.getPageInstance(page);
										$value = pageInstance ? pageInstance.$value : function(value) { return null };
									}
									var result = (new Function('with(this) { return ' + formatter.script + ' }')).call({
										value: value,
										$value: $value,
										state: {value:value},
										$services: self.$services
									});
									//var result = eval(code);
									if (result instanceof Function) {
										result = result.bind(this);
										result = result(value);
									}
									return result;
								},
								// in the future we can expose these parameters in the page itself
								skipCompile: true,
								html: true,
								// and add a configuration if necessary
								//configure: "page-format-resolver",
								name: formatter.name,
								namespace: "nabu.page.custom"
							});
						}
					});
				}
			});
		},
		loadPages: function(pages) {
			var self = this;
			pages.map(function(page) {
				if (!page.content) {
					Vue.set(page, "content", self.normalize(page.marshalled ? JSON.parse(page.marshalled) : {}));
				}
				
				var parameters = {};
				if (page.content.parameters) {
					page.content.parameters.filter(function(x) { return !x.private }).forEach(function(x) {
						parameters[x.name] = self.getResolvedPageParameterType(x.type, null, x.isArray);
						// currently we do not want to allow you to map different parts
						if (parameters[x.name].properties) {
							parameters[x.name].properties = {};
						}
					})
				}
				
				var pagePath = page.content.path;
				if (pagePath && pagePath.indexOf("/") != 0) {
					pagePath = "/" + pagePath;
				}
				// allow for translatable urls
				// may not work during translation redirects!!
				if (pagePath) {
					pagePath = self.translate(pagePath);
				}
				var route = {
					alias: self.alias(page),
					url: page.content.initial ? "/.*" : pagePath,
					query: page.content.query ? page.content.query : [],
					name: page.content.label ? page.content.label : page.content.name,
					category: page.content.category,
					//parameters: page.content.parameters ? page.content.parameters.map(function(x) { return x.name }) : [],
					parameters: parameters,
					enter: function(parameters, mask) {
						var serviceContextVariable = page.content.serviceContext;
						if (serviceContextVariable && serviceContextVariable.indexOf("page.") == 0) {
							serviceContextVariable = serviceContextVariable.substring("page.".length);
							// we want to allow "easy" use of service contexts in pages in a situation where it doesn't matter
							// for example you design masterdata screens to be able to support service context
							// but you also want to plug them in easily in an application that doesn't care
							// if we are using a page variable that is derived from the path
							if (pagePath && pagePath.indexOf("{" + serviceContextVariable + "}") >= 0) {
								// and it does not have a value
								if (!parameters[serviceContextVariable]) {
									// set it to default, the swagger client knows that it should not send it in that case
									parameters[serviceContextVariable] = "default";
								}
							}
						}
						if (page.content.initial) {
							var found = !!self.findMain(page.content);
							// check that there is a row/cell with the default anchor, if not, insert it
/*							for (var i = 0; i < page.content.rows.length; i++) {
								if (page.content.rows[i].customId == "main") {
									found = true;
									break;
								}
							}*/
							// we push a row so we can route _something_
							// otherwise everything might break!
							if (!found) {
								page.content.rows.push({
									id: 0,
									customId: "main",
									cells: [],
									class: null
								});
							}
						}
						else if (page.content.path) {
							// break out
							setTimeout(function() {
								self.$services.analysis.push({
									event: "browse",
									category: "page",
									component: page.content.name,
									path: page.content.path,
									data: parameters
								});
							}, 1);
						}
						// we update the og:url meta tag to make sure we can share this page
						var url = "${when(environment('url') != null, environment('url'), '')}";
						// We only put absolute uris in the og:url meta tag
						if (url && page.content.path) {
							// the router returns a path with the server.root() in it
							var absoluteUrl = url + self.$services.router.router.templateUrl(page.content.path, parameters, page.content.query);
							self.updateUrl(absoluteUrl);
						}
						return new nabu.page.views.Page({propsData: {page: page, parameters: parameters, stopRerender: parameters ? parameters.stopRerender : false, pageInstanceId: self.pageCounter++, masked: mask }});
					},
					// ability to recognize page routes
					isPage: true,
					initial: page.content.initial,
					roles: page.content.roles != null && page.content.roles.length > 0 ? page.content.roles : null,
					slow: !page.content.initial && page.content.slow,
					parent: page.content.pageParent,
					defaultAnchor: page.content.defaultAnchor,
					// additional properties set on the page
					properties: page.content.properties ? page.content.properties : []
				};
				
				self.$services.router.unregister(self.alias(page));
				self.$services.router.register(route);
			});
		},
		normalize: function(content) {
			// the rows with content
			if (!content.rows) {
				content.rows = [];
			}
			if (!content.path) {
				content.path = null;
			}
			// a counter that serves as id generator
			if (!content.counter) {
				content.counter = 1;
			}
			// contains the definition of the variables (usually just a name)
			// does _not_ contain the value, this is a runtime thing
			if (!content.variables) {
				content.variables = [];
			}
			// definition of the query parameters
			if (!content.query) {
				content.query = [];
			}
			// actions linked to an event
			if (!content.actions) {
				content.actions = [];
			}
			// css class
			if (!content.class) {
				content.class = null;
			}
			if (!content.initial) {
				content.initial = false;
			}
			if (!content.menuX) {
				content.menuX = 0;
			}
			if (!content.menuY) {
				content.menuY = 0;
			}
			if (!content.states) {
				content.states = [];
			}
			if (!content.category) {
				content.category = null;
			}
			if (!content.slow) {
				content.slow = false;
			}
			return content;
		},
		getParentRoutes: function(newValue, not) {
			var routes = this.$services.router.list().filter(function(x) { return !!x.alias && !!x.defaultAnchor }).map(function(x) { return x.alias });
			if (newValue) {
				routes = routes.filter(function(x) { return x.toLowerCase().indexOf(newValue.toLowerCase()) >= 0 });
			}
			if (not) {
				routes = routes.filter(function(x) { return not.indexOf(x) < 0 });
			}
			routes.sort();
			return routes;
		},
		prettifyRouteAlias: function(alias) {
			var routes = this.$services.router.list();
			var route = routes.filter(function(x) { return x.alias == alias })[0];
			if (route && route.name) {
				var sameName = routes.filter(function(x) { return x.name == route.name });
				if (sameName.length >= 2) {
					return route.name + (route.category ? " (" + route.category + ")" : "");
				}
				else {
					return route.name;
				}
			}
			return alias;
		},
		getNamedRoutes: function(newValue) {
			var routes = this.$services.router.list().filter(function(x) { return !!x.alias && !!x.name && (!newValue || x.name.toLowerCase().indexOf(newValue.toLowerCase()) >= 0) });
			routes.sort(function(a, b) {
				return a.name.localeCompare(b.name);
			});
			return routes;
		},
		getPageRoutes: function(newValue) {
			// allow rules
			if (newValue && newValue.indexOf("=") == 0) {
				return [{
					alias: newValue, 
					name: "Calculated route"
				}];
			}
			var routes = this.$services.router.list().filter(function(x) { return x.isPage });
			// originally we couldn't route to skeletons, it is "normally" not done
			// however, a subskeleton needed a default routing because it did routing dynamically based on initial state
			//var routes = this.$services.router.list().filter(function(x) { return x.isPage && !x.defaultAnchor });
			routes.sort(function(a, b) {
				return a.name.localeCompare(b.name);
			});
			if (newValue) {
				routes = routes.filter(function(a) {
					return a.name.toLowerCase().indexOf(newValue.toLowerCase()) >= 0
						|| (a.label && a.label.toLowerCase().indexOf(newValue.toLowerCase()) >= 0);
				});
			}
			return routes;
		},
		// routes that can be embedded
		getEmbeddableRoutes: function(newValue) {
			return this.getRoutes(newValue, true);
		},
		getRoutes: function(newValue, embeddedOnly) {
			var routes = this.$services.router.list().filter(function(x) { return !!x.alias });
			if (embeddedOnly) {
				routes = routes.filter(function(x) {
					// if it's a page, it must NOT have a parent
					// this can trigger some weird rerendering issues
					// alternative is that masking is further applied on parent rerouting, but it is weird to embed a page with a parent
					// you can split this up into a utility page and a wrapper that makes it bookmarkable with a parent
					return !x.isPage || !x.parent;
				});
			}
			routes = routes.map(function(x) { return x.alias });
			if (newValue) {
				routes = routes.filter(function(x) { return x.toLowerCase().indexOf(newValue.toLowerCase()) >= 0 });
			}
			routes.sort();
			return routes;
		},
		// TODO: if the route is a page, we want to have more detailed information about the page parameters
		// for example if you have a complex internal variable in the page with definition etc, the route parameters will only state that there is _a_ variable, not the actual definition
		// either we enrich routes with this information already present when loading pages or we have a better way to go from the route to the actual page so we can use getPageParameters
		getRouteParameters: function(route) {
			var result = {
				properties: {}
			};
			if (!route) {
				return result;
			}
			if (route.parent) {
				var parentRoute = this.$services.router.get(route.parent);
				if (parentRoute) {
					var parentResult = this.getRouteParameters(parentRoute);
					if (parentResult && parentResult.properties) {
						nabu.utils.objects.merge(result.properties, parentResult.properties);
					}
				}
			}
			if (route.url) {
				this.pathParameters(route.url).map(function(key) {
					result.properties[key] = {
						type: "string"
					}
				});
			}
			if (route.query) {
				route.query.map(function(key) {
					// the key could already be a complex definition (though unlikely)
					result.properties[key] = typeof(key) == "string" ? {type: "string"} : key;
				});
			}
			// we assume a parameters object that has the json-esque definitions
			if (route.parameters) {
				nabu.utils.objects.merge(result.properties, route.parameters);
			}
			return result;
		},
		getArrays: function(definition, path, arrays) {
			if (!arrays) {
				arrays = [];
			}
			if (definition && definition.properties) {
				var keys = Object.keys(definition.properties);
				for (var i = 0; i < keys.length; i++) {
					var property = definition.properties[keys[i]];
					// we've had properties like "body" that were "undefined"
					if (property != null) {
						var childPath = (path ? path + "." : "") + keys[i];
						if (property.type == "array") {
							arrays.push(childPath);
						}
						else if (property.properties) {
							this.getArrays(property, childPath, arrays);
						}
					}
				}
			}
			// the definition itself could be an array, the path is likely null at that point though...
			else if (definition && definition.type == "array") {
				arrays.push(path);
			}
			return arrays;
		},
		// this simply returns all available parameters, regardless of whether you listen on it or not
		// currently not cell specific, so does not take into account repeats
		getAllAvailableParameters: function(page, context) {
			var result = {};

			var self = this;
			if (!context) {
				context = self;
			}
			var pageInstance = self.$services.page.getPageInstance(page, context);
			
			var provided = this.getProvidedParameters();
			Object.keys(provided.properties).map(function(key) {
				result[key] = provided.properties[key];	
			});
			
			var application = this.getApplicationParameters();
			if (Object.keys(application.properties).length) {
				result.application = application;
			}

			// if you inherit from another page, we add that as well
			if (page.content.pageParent) {
				var parentPage = this.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage != null) {
					result.parent = {properties:this.getAllAvailableParameters(parentPage)};
				}
			}
			// if not defined explicitly, we might still have a parent in this context?
			else {
				var parentInstance = self.$services.page.getParentPageInstance(page, context);
				if (parentInstance && parentInstance.page) {
					result["parent"] = {properties:this.getAllAvailableParameters(parentInstance.page)};
				}
			}
			
			this.normalizeParentScope(result);
			
			// and the page itself
			// we exclude the dynamic because we add it below
			result.page = this.getPageParameters(page, true);
			
			// the available state
			page.content.states.map(function(state) {
				var operation = null;
				if (state.inherited) {
					operation = self.applicationState.filter(function(x) { return x.name == state.applicationName }).map(function(x) { return x.operation })[0];
				}
				else {
					operation = state.operation;
				}
				if (operation && self.$services.swagger.operation(operation) && self.$services.swagger.operation(operation).responses && self.$services.swagger.operation(operation).responses["200"]) {
					result[state.name] = self.$services.swagger.resolve(self.$services.swagger.operation(operation).responses["200"]).schema;
				}
			});
			
			// the available computed
			if (page.content.computed) {
				page.content.computed.map(function(state) {
					if (state.name && state.bindings && state.bindings[state.name] && state.bindings[state.name].label == "$function") {
						var output = self.getFunctionOutputFull(state.bindings[state.name].value);
						if (state.bindings && state.bindings[state.name].output) {
							output = output.properties[state.bindings[state.name].output];
						}
						result[state.name] = output;
					}
				});
			}
			
			// and map all events
			var available = pageInstance.getEvents();
			Object.keys(available).map(function(key) {
				result[key] = available[key];
			});
			
			nabu.page.providers("page-enumerate").forEach(function(x) {
				if (x.enumerate && x.label) {
					var tmp = {};
					var entries = x.enumerate();
					if (entries) {
						entries.forEach(function(y) {
							tmp[y[x.label]] = {
								type: "string"
							};
						});
						result[x.name] = {properties:tmp};
					}
				}
			});
			
			var scanRows = function(rows) {
				rows.forEach(function(row) {
					if (row.cells) {
						row.cells.forEach(function(cell) {
							if (cell.alias && cell.contentRuntimeAlias) {
								result[cell.contentRuntimeAlias] = self.getRouteParameters(self.$services.router.get(cell.alias));
							}
							if (cell.rows && cell.rows.length) {
								scanRows(cell.rows);
							}
						})
					}
				})
			}
			if (page.content.rows) {
				scanRows(page.content.rows);
			}
			
			this.enrichWithRuntimeAliasDefinitions(result, pageInstance);
			
			return result;
		},
		enrichWithRuntimeAliasDefinitions: function(result, pageInstance) {
			// and map all the aliased components
			Object.keys(pageInstance.components).forEach(function(x) {
				if (x.indexOf("alias_") == 0) {
					var name = x.substring("alias_".length);
					var component = pageInstance.components[x];
					if (component.getState) {
						var definition = component.getState();
						if (definition) {
							result[name] = definition;
						}
					}
				}
			});	
			var self = this;
			this.getAvailableRenderers(pageInstance.page).forEach(function(target) {
				if (target.runtimeAlias) {
					var state = self.getRendererState(target.renderer, target, pageInstance.page, result);
					if (state) {
						result[target.runtimeAlias] = state;
					}
				}
			});
		},
		// get the renderers in a page
		getAvailableRenderers: function(page) {
			var renderers = [];
			var self = this;
			// we also want to find all aliased rows and cells
			var checkRows = function(rows) {
				rows.forEach(function(row) {
					if (row.renderer) {
						renderers.push(row);
					}
					if (row.cells) {
						row.cells.forEach(function(cell) {
							if (cell.renderer) {
								renderers.push(cell);
							}
							if (cell.rows) {
								checkRows(cell.rows);
							}
						})
					}
				})
			}
			if (page && page.content && page.content.rows) {
				checkRows(page.content.rows);
			}
			return renderers;
		},
		getAllAvailableKeys: function(page, includeComplex, value) {
			var keys = [];
			var self = this;
			var parameters = this.getAllAvailableParameters(page);
			Object.keys(parameters).map(function(key) {
				// not the page itself? this is mostly for eventing purposes, for other purposes it might be interesting to keep it
				if (includeComplex && key != "page") {
					keys.push(key);
				}
				// if we want complex, we also want arrays (this was added later and backwards compatible etc etc)
				nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(parameters[key], includeComplex, includeComplex).filter(function(x) { return x != null}).map(function(x) {
					return key + "." + x;
				}));
			});
			if (value) {
				keys = keys.filter(function(x) {
					return x && x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return keys;
		},
		getAvailableKeys: function(page, cell, includeAllEvents) {
			var keys = [];
			var self = this;
			var parameters = this.getAvailableParameters(page, cell, includeAllEvents);
			Object.keys(parameters).map(function(key) {
				nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(parameters[key]).map(function(x) {
					return key + "." + x;
				}));
			});
			return keys;
		},
		getAvailableParameters: function(page, cell, includeAllEvents) {
			var result = {};

			var self = this;
			var pageInstance = self.$services.page.getPageInstance(page, self);
			
			// the available events
			var available = pageInstance.getEvents();
			if (includeAllEvents) {
				Object.keys(available).map(function(key) {
					result[key] = available[key];
				});
			}
			
			var provided = this.getProvidedParameters();
			Object.keys(provided.properties).map(function(key) {
				result[key] = provided.properties[key];	
			});
			
			var application = this.getApplicationParameters();
			if (Object.keys(application.properties).length) {
				result.application = application;
			}
			
			// if you inherit from another page, we add that as well
			if (page.content.pageParent) {
				var parentPage = this.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage != null) {
					//result.parent = this.getPageParameters(parentPage);
					result["parent"] = {properties:this.getAvailableParameters(parentPage, null, includeAllEvents)};
				}
			}
			// if not defined explicitly, we might still have a parent in this context?
			else {
				var parentInstance = self.$services.page.getParentPageInstance(page, self);
				if (parentInstance && parentInstance.page) {
					// it is a fragment parent, the data belongs in the same scope
					if (parentInstance == pageInstance.$props.fragmentParent) {
						nabu.utils.objects.merge(result, this.getAvailableParameters(parentInstance.page, null, includeAllEvents));
					}
					else {
						//result["parent"] = this.getPageParameters(parentInstance.page);
						result["parent"] = {properties:this.getAvailableParameters(parentInstance.page, null, includeAllEvents)};
					}
				}
			}
			
			this.normalizeParentScope(result);
			
			// and the page itself
			result.page = this.getPageParameters(page);

			// the available state, page state overrides page parameters & application parameters if relevant
			page.content.states.map(function(state) {
				var operation = null;
				if (state.inherited) {
					operation = self.applicationState.filter(function(x) { return x.name == state.applicationName }).map(function(x) { return x.operation })[0];
				}
				else {
					operation = state.operation;
				}
				if (operation) {
					operation = self.$services.swagger.operation(operation);
					if (operation && operation.responses && operation.responses["200"]) {
						result[state.name] = self.$services.swagger.resolve(operation.responses["200"]).schema;
					}
				}
			});
			
			// the available computed
			if (page.content.computed) {
				page.content.computed.map(function(state) {
					if (state.name && state.bindings && state.bindings[state.name] && state.bindings[state.name].label == "$function") {
						var output = self.getFunctionOutputFull(state.bindings[state.name].value);
						if (state.bindings && state.bindings[state.name].output) {
							output = output.properties[state.bindings[state.name].output];
						}
						result[state.name] = output;
					}
				});
			}
			
			var scanRows = function(rows) {
				rows.forEach(function(row) {
					if (row.cells) {
						row.cells.forEach(function(cell) {
							if (cell.alias && cell.contentRuntimeAlias) {
								result[cell.contentRuntimeAlias] = self.getRouteParameters(self.$services.router.get(cell.alias));
							}
							if (cell.rows && cell.rows.length) {
								scanRows(cell.rows);
							}
						})
					}
				})
			}
			if (page.content.rows) {
				scanRows(page.content.rows);
			}
			
			this.enrichWithRuntimeAliasDefinitions(result, pageInstance);
			
			// cell specific stuff overwrites everything else
			if (cell) {
				var targetPath = this.getTargetPath(page.content, cell.id);
				if (targetPath && targetPath.length) {
					targetPath.map(function(part) {
						if (part.on) {
							result[part.on] = available[part.on];
						}
						if (part.instances) {
							Object.keys(part.instances).map(function(key) {
								var array = part.instances[key];
								if (array) {
									var variable = array.substring(0, array.indexOf("."));
									var rest = array.substring(array.indexOf(".") + 1);
									if (result[variable]) {
										result[key] = self.getChildDefinition(result[variable], rest).items;
									}
								}
							})
						}
						if (part.cellState) {
							Object.keys(part.cellState).map(function(key) {
								result[key] = part.cellState[key];
							});
						}
					});
				}
			}

			return result;	
		},
		getTarget: function(rowContainer, id, parent) {
			if (rowContainer.rows) {
				for (var i = 0; i < rowContainer.rows.length; i++) {
					if (rowContainer.rows[i].id == id) {
						return parent ? rowContainer : rowContainer.rows[i];
					}
					if (rowContainer.rows[i].cells) {
						for (var j = 0; j < rowContainer.rows[i].cells.length; j++) {
							if (rowContainer.rows[i].cells[j].id == id) {
								return parent ? rowContainer.rows[i] : rowContainer.rows[i].cells[j];
							}
							var has = this.getTarget(rowContainer.rows[i].cells[j], id, parent);
							if (has) {
								return has;
							}
						}
					}
				}
			}
			return null;
		},
		suggestField: function(page, value) {
			var fields = [];
			var parameters = this.getAvailableParameters(page, null, true);
			nabu.utils.arrays.merge(fields, this.getSimpleKeysFor({properties:parameters}, true, true));
			fields.sort();
			if (value) {
				fields = fields.filter(function(x) {
					return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
				});
			}
			return fields;
		},
		suggestArray: function(page, value) {
			return this.getAllArrays(page).filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0
			});
		},
		getAllArrays: function(page, targetId) {
			var self = this;
			var arrays = [];
			// get all the arrays available in the page itself
			// TODO: filter events that you are not registered on?
			var parameters = this.getAvailableParameters(page, null, true);
			Object.keys(parameters).map(function(key) {
				nabu.utils.arrays.merge(arrays, self.getArrays(parameters[key]).map(function(x) { return x == null ? key : key + "." + x }));
			});
			// @2024-06-11: only in v1?
			if (targetId != null && false) {
				// get all arrays available in parent rows/cells
				var path = this.getTargetPath(page.content, targetId);
				if (path.length) {
					path.map(function(entry) {
						if (entry.instances) {
							Object.keys(entry.instances).map(function(key) {
								var mapping = entry.instances[key];
								if (mapping) {
									var index = mapping.indexOf(".");
									var variable = mapping.substring(0, index);
									var path = mapping.substring(index + 1);
									var definition = self.getChildDefinition(parameters[variable], path);
									nabu.utils.arrays.merge(arrays, self.getArrays(definition.items).map(function(x) { return key + "." + x }));
								}
							});
						}
					});
				}
			}
			return arrays;
		},
		getChildDefinition: function(definition, path, parts, index) {
			if (!parts) {
				parts = path.split(".");
				index = 0;
			}
			var properties = definition == null ? null : (definition.type == "array" ? definition.items.properties : definition.properties);
			if (properties) {
				var child = properties[parts[index]];
				if (index == parts.length - 1) {
					return child;
				}
				else {
					return this.getChildDefinition(child, path, parts, index + 1);
				}
			}
			return null;
		},
		cloneByReference: function(object) {
			var self = this;
			var result;
			if (object instanceof Array) {
				result = [];
				object.forEach(function(x) {
					result.push(self.cloneByReference(x));
				});
			}
			else if (self.isObject(object)) {
				result = {};
				Object.keys(object).forEach(function(key) {
					result[key] = self.cloneByReference(object[key]);
				});
			}
			else {
				result = object;
			}
			return result;
		},
		smartClone: function(object) {
			if (object == null) {
				return null;
			}
			var self = this;
			// when we clone things like blob and files, they break, so we do it slightly smarter
			var cloned = JSON.parse(JSON.stringify(object));
			var scanForSpecials = function(original, cloned) {
				if (original instanceof Blob || original instanceof File) {
					return original;
				}
				else if (original instanceof Date) {
					return new Date(original.getTime());
				}
				else if (original instanceof Array) {
					original.forEach(function(y, index) {
						cloned[index] = scanForSpecials(y, cloned[index]);
					})
				}
				else if (self.isObject(original)) {
					Object.keys(original).forEach(function(x) {	
						cloned[x] = scanForSpecials(original[x], cloned[x]);	
					});
				}
				return cloned;
				// this logic assumes you already have an object which is not necessarily the case
				// sometimes we smart clone whatever data you are binding
				/*
				Object.keys(original).forEach(function(x) {
					if (original[x] instanceof Blob || original[x] instanceof File) {
						// should be immutable
						cloned[x] = original[x];
					}
					else if (original[x] instanceof Date) {
						cloned[x] = new Date(original[x].getTime());
					}
					if (original[x] instanceof Array) {
						original[x].forEach(function(y, index) {
							if (self.isObject(y)) {
								scanForSpecials(y, cloned[x][index]);
							}
						});
					}
					else if (self.isObject(original[x])) {
						scanForSpecials(original[x], cloned[x]);
					}
				});
				*/
			};
			return scanForSpecials(object, cloned);
			//return cloned;
		},
		explode: function(into, from, path) {
			var self = this;
			Object.keys(from).forEach(function(key) {
				if (key != null) {
					var value = from[key];
					if (value != null) {
						var childPath = path ? path + "." + key : key;
						// if we explode the arrays as well, they are added like myarray.0.myitem etc
						// in the form engine this can make it hard to manipulate lists as a list item
						// because the arrays are exploded but the form list items work directly on the actual arrays
						// when remerging, the array items are overwritten by the exploded version
						if (self.isObject(value) && !(value instanceof Array)) {
							if (!value._isVue) {
								self.explode(into, value, childPath);
							}
						}
						// only set root values if we have a path?
						else if (path != null) {
							Vue.set(into, childPath, from[key]);
						}
					}
				}	
			});
		},
		isObject: function(object) {
			return object != null 
				&& Object(object) === object 
				&& !(object instanceof Date)
				&& !(object instanceof File)
				&& !(object instanceof Blob);
		},
		isPublicPageParameter: function(page, name) {
			if (page && page.content && page.content.path) {
				if (this.pathParameters(page.content.path).indexOf(name) >= 0) {
					return true;
				}
			}
			if (page && page.content && page.content.query) {
				if (page.content.query.indexOf(name) >= 0) {
					return true;
				}
			}
			return false;
		},
		filterPageStartupParameters: function(page, value) {
			var result = this.getPageStartupParameters(page);	
			var keys = this.getSimpleKeysFor({properties: result}, true);
			return value ? keys.filter(function(x) {
				return x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			}) : keys;
		},
		// for example for initial state, we were using "getPageParameters" which only lists parameters available in the page itself (which is what we want)
		// it should not, for instance, include events (which can not have triggered yet in initial state) nor runtime aliases from renderers (again, not yet available)
		// but we DO need the parent state at that point
		// the getAllAvailableParameters is too broad, it takes all the not-yet-available data into account
		getPageStartupParameters: function(page) {
			var self = this;
			var result = {page: this.getPageParameters(page, true)};
			// if you inherit from another page, we add that as well
			if (page.content.pageParent) {
				var parentPage = this.pages.filter(function(x) {
					return x.content.name == page.content.pageParent;
				})[0];
				if (parentPage != null) {
					result.parent = this.getPageParameters(parentPage);
				}
			}
			// if not defined explicitly, we might still have a parent in this context?
			else {
				var parentInstance = self.$services.page.getParentPageInstance(page);
				if (parentInstance && parentInstance.page) {
					result.parent = this.getPageParameters(parentInstance.page);
				}
			}
			return result;
		},
		// we squash parent scopes into a single scope, so it doesn't matter how many parents you have
		// by specifying the exact parent, the result would be too fragile depending on a very specific layout
		// this does mean if your parent has a variable with the same name as your grandparent, you can not access the grandparent variable
		normalizeParentScope: function(result) {
			// normalize parent scope
			if (result && result.parent && result.parent.properties && result.parent.properties.parent) {
				var parentParent = result.parent.properties.parent;
				delete result.parent.properties.parent;
				var newParent = {};
				nabu.utils.objects.merge(newParent, parentParent);
				// if you redefine the variable in this page, it will be overridden
				nabu.utils.objects.merge(newParent, result.parent);
				result.parent = newParent;
			}
		},
		// TODO: we don't want to be able to edit stuff like events
		// but components can add their own state to the page
		// for that reason, we do need the page instance, to get (in turn) the aliased components with their own state
		// we can't guarantee that the components will be there at runtime (due to conditions)
		// but at you need to be able to bind to these things
		// for instance the page-level form fields use this service to deduce which fields they can write to
		getPageParameters: function(page, excludeRuntime, excludePrivate) {
			var parameters = {
				properties: {}
			};
			if (page.content.path) {
				this.pathParameters(page.content.path).map(function(x) {
					parameters.properties[x] = {
						type: "string"
					}
				})
			}
			if (page.content.query) {
				page.content.query.map(function(x) {
					parameters.properties[x] = {
						type: "string"
					}
				});
			}
			
			var self = this;
			if (page.content.states) {
				page.content.states.forEach(function(x) {
					var operation = null;
					if (x.inherited) {
						operation = self.applicationState.filter(function(y) { return y.name == x.applicationName }).map(function(y) { return y.operation })[0];
					}
					else {
						operation = x.operation;
					}
					if (x.name && operation) {
						operation = self.$services.swagger.operation(operation);
						if (operation && operation.responses && operation.responses["200"]) {
							var schema = operation.responses["200"].schema;
							if (schema && schema.$ref) {
								var definition = self.getResolvedPageParameterType(schema.$ref, null, x.isArray);
								if (definition) {
									parameters.properties[x.name] = definition;
								}
							}
						}
					}
				});
			}
			
			var pageInstance = this.getPageInstance(page);
			// you can set parameters much like swagger input parameters
			// that means you can set a name
			// you can also set a default value and other stuff
			if (page.content.parameters) {
				var self = this;
				page.content.parameters.filter(function(x) { return !excludePrivate || !x.private }).forEach(function(x) {
					/*if (x.type == null || ['string', 'boolean', 'number', 'integer'].indexOf(x.type) >= 0) {
						parameters.properties[x.name] = {
							type: x.type == null ? "string" : x.type
						}
					}
					else {
						parameters.properties[x.name] = self.$services.swagger.resolve(self.$services.swagger.definition(x.type))
					}*/
					var currentValue = null;
					if (x.template) {
						currentValue = self.eval(x.template);
					}
					else {
						currentValue = pageInstance ? pageInstance.get(x.name) : null;
					}
					if (x.useDefinition && x.definition) {
						parameters.properties[x.name] = JSON.parse(x.definition);	
					}
					else {
						parameters.properties[x.name] = self.getResolvedPageParameterType(x.type, currentValue, x.isArray);
					}
				});
			}
			
//			parameters = {properties:{page: { properties: parameters.properties}}};
			
			if (pageInstance && !excludeRuntime) {
				this.enrichWithRuntimeAliasDefinitions(parameters.properties, pageInstance);
			}
			
			return parameters;
		},
		// not used atm
		getTranslatableParameters: function(part, translations) {
			if (translations == null) {
				translations = [];
			}
			var self = this;
			if (part.$translations) {
				part.$translations.forEach(function(translation) {
					if (part[translation]) {
						translations.push({
							key: translation,
							value: part[translation]
						});
					}
				});
			}
			Object.keys(part).forEach(function(key) {
				if (key != "$translations" && (!part.$translations || part.$translations.indexOf(key) < 0)) {
					if (typeof(part[key]) == "object") {
						self.getTranslatableParameters(part[key], translations);
					}
					else if (part[key] instanceof Array) {
						part[key].forEach(function(single) {
							if (typeof(single) == "object") {		
								self.getTranslatableParameters(single, translations);
							}
						})
					}
				}
			})
			return translations;
		},
		notify: function(severity, message) {
			this.validations.push({
				severity: severity,
				message: message,
				title: message
			});
		},
		guessNameFromOperation: function(operation) {
			var parts = operation.split(".");
			var reserved = ["create", "read", "update", "delete", "list", "get", "rest", "crud", "services"];
			for (var i = parts.length - 1; i >= 0; i--) {
				if (reserved.indexOf(parts[i]) < 0) {
					return parts[i];
				}
			}
			return null;
		},
		getResolvedPageParameterType: function(type, instance, isArray) {
			var result;
			if (type == null && instance != null) {
				result = this.getSchemaFromObject(instance);
			}
			else if (type == null || ['string', 'boolean', 'number', 'integer'].indexOf(type) >= 0) {
				result = {type:type == null ? "string" : type};
			}
			else {
				try {
					result = this.$services.swagger.resolve(this.$services.swagger.definition(type));
				}
				catch (exception) {
					console.error("Could not resolve type: " + type);
					return {type: "string"};
				}
			}
			if (result && isArray) {
				result = {
					type: "array",
					items: result
				}
			}
			return result;
		},
		getApplicationProperties: function() {
			var properties = {};
			this.properties.map(function(property) {
				properties[property.key] = property.value;
			});
			this.environmentProperties.map(function(property) {
				properties[property.key] = property.value;
			});
			return properties;
		},
		// @2022-10-26: deprecated because its weird (still need to check if its actually used anywhere)
		getApplicationParameters: function() {
			var parameters = {
				properties: {}
			};
			// and you can set parameters at the web application level that are accessible to any page
			this.properties.map(function(property) {
				parameters.properties[property.key] = property;
			});
			this.environmentProperties.map(function(property) {
				parameters.properties[property.key] = property;
			});
			return parameters;
		},
		getProvidedParameters: function() {
			var parameters = {
				properties: {}
			};
			nabu.page.providers("page-bindings").map(function(provider) {
				var result = provider();
				if (result && result.definition) {
					Object.keys(result.definition).map(function(key) {
						parameters.properties[key] = result.definition[key];	
					});
				}
			});
			return parameters;
		},
		// retrieves the path of rows/cells to get to the targetId, this can be used to resolve instances for example
		getTargetPath: function(rowContainer, targetId, recursive) {
			// when we explode for example cells in a loop, the id is further finetuned, for example the original cell might have id "2", the exploded will have "2-1", "2-2" etc to guarantee in-document uniqueness
			if (typeof(targetId) == "string" && targetId.indexOf("-") > 0) {
				targetId = targetId.substring(0, targetId.indexOf("-"));
			}
			var reverse = false;
			if (!recursive) {
				recursive = true;
				// we manage the complete path at this level, reverse when everything is done as the path contains everything in the reverse order
				reverse = true;
			}
			var self = this;
			var path = null;
			if (rowContainer.rows) {
				for (var i = 0; i < rowContainer.rows.length; i++) {
					path = [];
					var row = rowContainer.rows[i];
					if (row.id == targetId) {
						path.push(row);
					}
					else {
						for (var j = 0; j < row.cells.length; j++) {
							var cell = row.cells[j];
							if (cell.id == targetId) {
								path.push(cell);
								path.push(row);
							}
							else if (cell.rows) {
								var subPath = self.getTargetPath(cell, targetId, recursive);
								if (subPath && subPath.length) {
									nabu.utils.arrays.merge(path, subPath);
									path.push(cell);
									path.push(row);
								}
							}
							if (path.length) {
								break;
							}
						}
					}
					if (path.length) {
						break;
					}
				}
			}
			if (path && reverse) {
				path.reverse();
			}
			return path;
		},
		getSwaggerParametersAsKeys: function(operation) {
			var self = this;
			var keys = [];
			if (operation) {
				if (typeof(operation) == "string") {
					operation = this.$services.swagger.operations[operation];
				}
				operation.parameters.map(function(parameter) {
					if (parameter.in == "body") {
						var type = self.$services.swagger.resolve(parameter);
						if (type.schema.properties) {
							nabu.utils.arrays.merge(keys, self.getSimpleKeysFor(type.schema, true, true).map(function(x) { return "body." + x }));
						}
					}
					else {
						keys.push(parameter.name);
					}
				});
			}
			return keys;
		},
		registerHome: function(home, homeUser) {
			// the previous dynamic home route
			var previousDynamicHome = this.$services.router.router.list().filter(function(x) { return x.alias == "home" && !x.isPage })[0];
			if (previousDynamicHome) {
				this.$services.router.unregister(previousDynamicHome);
			}
			var self = this;
			// check if there is a page-based home, we need to still support that
			var originalHomeRoute = this.$services.router.router.list().filter(function(x) { return x.alias == "home" && x.isPage })[0];
			this.$services.router.register({
				alias: "home",
				enter: function(parameters) {
					// the timeout disconnects the reroute from the current flow
					// otherwise weird things happen
					setTimeout(function() {
						var applicableUser = self.users.filter(function(x) {
							var hasAnyRole = false;
							if (x.roles) {
								x.roles.forEach(function(role) {
									if (role == "$guest" && !self.$services.user.loggedIn) {
										hasAnyRole = true;
									}	
									else if (role == "$user" && self.$services.user.loggedIn) {
										hasAnyRole = true;
									}
									else if (self.$services.user.hasRole && self.$services.user.hasRole(role)) {
										hasAnyRole = true;
									}
								});
							}
							return hasAnyRole;
						})[0];
						if (applicableUser && applicableUser.home) {
							if (applicableUser.home == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(applicableUser.home, parameters);
							}
						}
						else if (homeUser && self.$services.user.loggedIn) {
							if (homeUser == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(homeUser, parameters);
							}
						}
						else if (home) {
							if (home == "home" && originalHomeRoute) {
								originalHomeRoute.enter(parameters);
							}
							else {
								self.$services.router.route(home, parameters);
							}
						}
						else {
							self.$services.router.route("login", parameters, null, true);
						}
					}, 1)
				},
				url: "/",
				priority: 1
			});
		},
		// unused?
		dropOperationInto: function (operation, cell, failIfMissing) {
			var self = this;
			if (this.$services.swagger.operations[operation]) {
				console.log("Dropping", operation);
			}
			else if (!failIfMissing) {
				this.reloadSwagger().then(function() {
					self.dropOperationInto(operation, cell, true);
				});
			}
		},
		updateUrl: function(url) {
			var element = document.head.querySelector("meta[property='og:url']");
			var insert = true;
			if (element) {
				if (element.getAttribute("content") != url) {
					element.parentNode.removeChild(element);
				}
				else {
					insert = false;
				}
			}
			if (insert && url) {
				element = document.createElement("meta");
				element.setAttribute("property", "og:url");
				element.setAttribute("content", url);
				document.head.appendChild(element);
			}
		},
		// update the branding parameters depending on the page
		updateBranding: function(branding, pageInstance) {
			var self = this;
			
			if (branding && pageInstance) {
				var resolvedBranding = {};
				Object.keys(branding).forEach(function(key) {
					resolvedBranding[key] = self.interpret(branding[key], pageInstance, pageInstance.variables, pageInstance.$value);
				})
				branding = resolvedBranding;
			}
			
			var fields = ["favicon", "title", "siteName", "description", "image", "imageAlt", "facebookAppId", "twitterUserName"];
			// the current branding takes the specific branding and (if absent) the default branding
			fields.forEach(function(field) {
				self.currentBranding[field] = branding[field] ? branding[field] : self.branding[field];
				// an exception for title...
				if (!self.currentBranding[field] && field == "title" && self.title) {
					self.currentBranding[field] = self.title;
				}
			})
			var og = ["title", "description", "image", "siteName"];
			
			fields.forEach(function(field) {
				if (field == "favicon") {
					// updating favicon
					var element = document.head.querySelector("link[rel='icon']");
					var insertFavicon = true;
					if (element) {
						if (element.getAttribute("href") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insertFavicon = false;
						}
					}
					if (insertFavicon && self.currentBranding[field]) {
						element = document.createElement("link");
						element.setAttribute("rel", "icon");
						element.setAttribute("type", "image/png");
						element.setAttribute("href", self.currentBranding[field]);
						document.head.appendChild(element);
					}
				}
				else if (og.indexOf(field) >= 0) {
					var element = document.head.querySelector("meta[property='og:" + field + "']");
					var insert = true;
					if (element) {
						if (element.getAttribute("content") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insert = false;
						}
					}
					if (insert && self.currentBranding[field]) {
						element = document.createElement("meta");
						element.setAttribute("property", "og:" + field);
						element.setAttribute("content", self.currentBranding[field]);
						document.head.appendChild(element);
					}
					if (field == "title" && self.currentBranding[field] != null) {
						document.title = self.templateTitle();
					}
				}
				else if (field == "imageAlt") {
					var element = document.head.querySelector("meta[name='twitter:image:alt']");
					var insert = true;
					if (element) {
						if (element.getAttribute("content") != self.currentBranding[field]) {
							element.parentNode.removeChild(element);
						}
						else {
							insert = false;
						}
					}
					if (insert && self.currentBranding[field]) {
						element = document.createElement("meta");
						element.setAttribute("name", "twitter:image:alt");
						element.setAttribute("content", self.currentBranding[field]);
						document.head.appendChild(element);
					}
				}
				// TODO: the others are not reactive yet, they are generally not updated per page...
			});
		},
		templateTitle: function(page) {
			var environment = this.getEnvironment();
			var template = this.title;
			if (page && page.content.title) {
				template = page.content.title;
			}
			else if (this.currentBranding && this.currentBranding.title) {
				template = this.currentBranding.title;
			}
			else if (this.branding && this.branding.title) {
				template = this.branding.title;
			}
			if (template) {
				var defaultTitle = template.match(/.*\{title\|([^}]+)\}.*/) ? template.replace(/.*\{title\|([^}]+)\}.*/, "$1") : "Unnamed";
				template = template.replace("{environment}", environment);
				if (page) {
					template = template.replace(/\{title[^}]*}/, page.content.label);
					template = template.replace("{category}", page.content.category);
				}
				else {
					template = template.replace(/\{title[^}]*}/, defaultTitle);
				}
				return this.$services.page.translate(this.$services.page.interpret(template, this));
			}
		},
		getEnvironment: function() {
			var environment = this.environment;
			// we assume stuff like "bebat-dev" etc, we are generally interested in the last bit
			var parts = environment.split("-");
			// the last part
			environment = parts[parts.length - 1].toUpperCase();
			return environment;
		},
		dashify: function(content) {
			if (content == null) {
				return null;
			}
			return this.underscorify(content).replace(/_/g, "-");
		},
		underscorify: function(content) {
			if (content == null) {
				return null;
			}
			return content.replace(/[^\w]+/g, "_").replace(/([A-Z]+)/g, "_$1").replace(/^_/, "").replace(/_$/, "")
				.replace(/[_]+/g, "_").toLowerCase();
		},
		prettify: function(text) {
			if (text == null) {
				return null;
			}
			text = this.underscorify(text);
			var result = null;
			text.split(/_/).forEach(function(x) {
				if (!result) {
					result = "";
				}
				else {
					result += " ";
				}
				if (x.length > 0) {
					result += x.substring(0, 1).toUpperCase() + x.substring(1);
				}
			});
			return result;
		},
		camelify: function(content) {
			if (content == null) {
				return null;
			}
			// first we do underscores, it is easiest
			// if we start or end with an underscore, remove it
			content = this.underscorify(content);
			var parts = content.split("_")
			var result = null;
			for (var i = 0; i < parts.length; i++) {
				if (result == null) {
					result = parts[i];
				}
				else {
					result += parts[i].substring(0, 1).toUpperCase() + parts[i].substring(1);
				}
			}
			return result;
		},
		normalizeCell: function(cell) {
			if (cell.rows == null) {
				cell.rows = [];
			}
			if (cell.bindings == null) {
				cell.bindings = {};
			}
			if (cell.devices == null) {
				cell.devices = [];
			}
			if (cell.id == null) {
				cell.id = -1;
			}
			cell.rows.forEach(this.normalizeRow);
			return cell;
		},
		normalizeRow: function(row) {
			if (row.cells == null) {
				row.cells = [];
			}
			if (row.id == null) {
				row.id = -1;
			}
			row.cells.forEach(this.normalizeCell);
			return row;
		},
		unsetCookie: function(cookie) {
			var index = cookie.indexOf('=');
			var name = index >= 0 ? cookie.substring(0, index) : cookie;
			var path = null;
			if (cookie.indexOf("path") >= 0) {
				path = cookie.replace(/[\n]+/, " ").replace(/.*;[\s]*path[\s]*=[\s]*([^;]+).*/, "$1");
				if (path == cookie) {
					path = null;
				}
			}
			if (path == null) {
				path = "${when(environment('cookiePath') == null, environment('serverPath'), environment('cookiePath'))}";
			}
			var expires = "";
			var days = -365;
			var value = "cleared"; 
			var domain = null;
			if (cookie.indexOf("domain") >= 0) {
				domain = cookie.replace(/[\n]+/, " ").replace(/.*;[\s]*domain[\s]*=[\s]*([^;]+).*/, "$1");
				if (domain == cookie) {
					domain = null;
				}
			}
			var date = new Date();
			date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
			expires = "; expires=" + date.toUTCString();
			var fullCookie = name + "=" + value + expires + "; path=" + path
				+ (domain ? ";domain=" + domain : "");
			// pre and post intercept
			if (document.originalCookie != null) {
				document.originalCookie = fullCookie;
			}
			else {
				document.cookie = fullCookie;
			}
			// it seems setting with domain "null" does not unset cookies at for example ".sub.domain.com"
			// we do a second round with the actual domain, this seems to work to remove those as well
			if (domain == null) {
				domain = "${environment('host')}";
			}
			var fullCookie = name + "=" + value + expires + "; path=" + path
				+ (domain ? ";domain=" + domain : "");
			if (document.originalCookie != null) {
				document.originalCookie = fullCookie;
			}
			else {
				document.cookie = fullCookie;
			}
		},
		// check if the name is allowed
		isAllowedCookie: function(name) {
			var allowedCookies = this.getAllowedCookies();
			if (allowedCookies.indexOf(name) >= 0) {
				return true;
			}
			for (var i = 0; i < allowedCookies.length; i++) {
				if (name.match(new RegExp(allowedCookies[i]))) {
					return true;
				}
			}
			return false;
		},
		// list all the cookies you want to accept, as an array
		acceptCookies: function(cookies) {
			if (!cookies) {
				cookies = [];
			}
			else if (!(cookies instanceof Array)) {
				cookies = [cookies];
			}
			// remember _100_ years!
			this.$services.cookies.set("cookie-settings", JSON.stringify(cookies), 365*100);
			this.calculateAcceptedCookies();
			// synchronize immediately
			this.synchronizeCookies();
			this.cookieHooks.forEach(function(x) { x(cookies) });
		},
		// you can add functions that are run everytime the cookie settings change
		addCookieHook: function(func) {
			this.cookieHooks.push(func);
			// immediately trigger in case you accepted in a previous instance
			func(this.getAllowedCookies());
		},
		interceptCookies: function() {
			var self = this;
			// now we write an intercept so any new cookies being written can not violate this
			var originalCookie = "originalCookie";
			if (!this.isSsr) {
				// we redirect document.cookie to document.originalCookie
				Object.defineProperty(
					Document.prototype, 
					originalCookie, 
					Object.getOwnPropertyDescriptor(Document.prototype, 'cookie')
				);
				// we redefine document.cookie
				Object.defineProperty(Document.prototype, 'cookie', {
					enumerable: true,
					configurable: true,
					get: function() {
						return this[originalCookie];
					},
					set: function(value) {
						// we check if the cookie is allowed
						var index = value.indexOf('=');
						if (index >= 0) {
							var cookieName = value.substring(0, index);
							// if it's allowed, we let it pass
							if (self.isAllowedCookie(cookieName)) {
								this[originalCookie] = value;
							}
							else {
								console.log("Blocking cookie", cookieName);
								self.unsetCookie(value);
							}
						}
					}
				});
			}
		},
		synchronizeCookies: function(repeat) {
			var self = this;
			// first up: remove any cookies that should not be there
			// the problem is load order, we can't fully guarantee to intercept all cookie setting, because that would require the javascript to be run before any includes are resolved
			// because this is hard to guarantee, we simply remove the cookies later on if it is relevant
			var cookies = document.cookie.split(/[\s]*;[\s]*/);
			for (var i = 0; i < cookies.length; i++) {
				var index = cookies[i].indexOf('=');
				if (index >= 0) {
					var name = cookies[i].substring(0, index);
					if (!self.isAllowedCookie(name)) {
						console.log("Removing cookie", name);
						self.unsetCookie(cookies[i]);
					}
				}
			}
			if (repeat) {
				// repeat periodically
				setTimeout(function() {
					self.synchronizeCookies(repeat)
				}, 30000);
			}
		}
	},
	watch: {
		environment: function(newValue, oldValue) {
			if (oldValue && document.body) {
				document.body.classList.remove("environment-" + oldValue);
			}
			if (newValue) {
				// TODO: update class
				var updateEnvironmentClass = function() {
					if (document.body) {
						document.body.classList.add("environment-" + newValue);
					}
					else {
						setTimeout(updateEnvironmentClass, 100);
					}
				}
				updateEnvironmentClass();
			}
		},
		editing: function(newValue) {
			// reset the calculated page types
			if (!newValue) {
				this.calculatedPageTypes = {};
			}
		},
		rendering: function(newValue) {
			if (newValue > 0) {
				if (this.stableTimer) {
					clearTimeout(this.stableTimer);
					this.stableTimer = null;
				}
				this.stable = false;
			}
			else {
				var self = this;
				this.stableTimer = setTimeout(function() {
					self.stable = true;
				}, 100);
			}
		},
		stable: function(newValue) {
			console.log("rendering stable", newValue);	
		},
		// push the location to the swagger client
		location: function(newValue) {
			this.$services.swagger.geoPosition = newValue;
		},
		pages: function(newValue) {
			if (!this.loading) {
				this.loadPages(newValue);
			}
		},
		title: function(newValue) {
			document.title = newValue;
		},
		home: function(newValue) {
			if (newValue && !this.loading) {
				this.registerHome(newValue, this.homeUser);
			}
		},
		homeUser: function(newValue) {
			if (newValue && !this.loading) {
				this.registerHome(this.home, newValue);
			}
		},
		showConsole: function(newValue) {
			if (this.canTest()) {
				// remove from DOM
				var element = document.querySelector("#nabu-console-instance");
				if (element) {
					element.parentNode.removeChild(element);
				}
				// render a console in the DOM
				if (newValue) {
					var div = document.createElement("div");
					div.setAttribute("id", "nabu-console-instance");
					document.body.appendChild(div);
					this.$services.router.route("nabu-console", { initialTab: "features" }, div);
					//this.$services.router.route("nabu-console", { initialTab: this.consoleTab }, div);
					document.body.classList.add("has-nabu-console");
					this.consoleTab = null;
				}
				else {
					document.body.classList.remove("has-nabu-console");
					this.limitReports();
				}
			}
		},
		branding: {
			deep: true,
			handler: function(newValue) {
				var self = this;
				Vue.nextTick(function() {
					self.updateBranding(self.branding);
				})
			}
		}
	}
}), { name: "nabu.page.services.Page" });


document.addEventListener("mousemove", function(event) {
	if (application && application.services && application.services.page) {
		application.services.page.mouseX = event.pageX;
		application.services.page.mouseY = event.pageY;
		application.services.page.mouseXPassive = event.pageX;
		application.services.page.mouseYPassive = event.pageY;
	}
});


var clearTemplates = function() {
	var scripts = document.head.getElementsByTagName("script");
	for (var i = scripts.length - 1; i >= 0; i--) {
		scripts[i].parentNode.removeChild(scripts[i]);
	}
}
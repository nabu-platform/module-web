// https://jsfiddle.net/Linusborg/mfqjk5hm/
// https://github.com/vuejs/vue/issues/7431
// try to avoid wrapper elements when inserting html
// not entirely sure if this is still responsive?
Vue.component('html-fragment', {
	functional: true,
	props: {
		html: {
			type: String, 
			required: true
		}
	},
	render: function(h, ctx) {
		return new Vue({
			beforeCreate: function() { this.$createElement = h }, // not necessary, but cleaner imho
			template: "<div>" + ctx.props.html + "</div>"
		}).$mount()._vnode.children;
	}
});

window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		
		$services.router.register({
			alias: "pages",
			enter: function(parameters) {
				return new nabu.page.views.Pages({propsData:parameters});
			},
			url: "/pages"
		});
		
		$services.router.register({
			alias: "home",
			enter: function(parameters) {
				// if you have not overridden this alias (home) but you have added a route at "/", let's look for that
				// it takes presedence over the pages here
				var hasHomeRoute = $services.router.router.findRoute(application && application.configuration ? application.configuration.root : "/");
				// it must not have the alias home, to prevent circular refreshes etc
				if (hasHomeRoute && hasHomeRoute.route && hasHomeRoute.route.alias != "home") {
					setTimeout(function() {
						console.log("routing to", hasHomeRoute);
						$services.router.route(hasHomeRoute.route.alias);
					}, 1);
				}
				else {
					return new nabu.page.views.Pages({propsData:parameters});
				}
			},
			priority: -5,
			url: "/"
		});
		
		$services.router.register({
			alias: "page-code",
			enter: function(parameters) {
				return new nabu.page.views.Code({propsData: parameters});
			}
		});
		
		$services.router.register({
			alias: "impersonate",
			priority: -10,
			url: "/impersonate",
			query: ["userId"],
			enter: function(parameters) {
				if (parameters.userId) {
					$services.user.impersonate(parameters.userId).then(function() {
						$services.router.route("home");
					}, function() {
						$services.router.route("error", {message:"%{Failed to impersonate}"});
					})
				}
			}
		});
		
		$services.router.register({
			alias: "page-fields",
			enter: function(parameters) {
				return new nabu.page.views.PageFields({propsData: parameters});
			},
			category: "Content",
			name: "Fields",
			description: "Display a number of fields.",
			icon: "page/core/images/page-fields.svg"
		});
		$services.router.register({
			alias: "page-fields-table",
			enter: function(parameters) {
				return new nabu.page.views.PageFieldsTable({propsData: parameters});
			}
		});
	
		$services.router.register({
			alias: "page-actions",
			enter: function(parameters) {
				return new nabu.page.views.PageActions({propsData: parameters});
			},
			icon: "page/core/images/buttons.svg",
			description: "Actions is a generic combination of buttons to form a menu, tabs,...",
			name: "Actions",
			category: "Interactive",
			query: ["active"]
		});
		
		$services.router.register({
			alias: "page-form",
			enter: function(parameters) {
				var component = Vue.component("page-form");
				return new component({propsData: parameters});
			},
			//name: "Form",
			//category: "Form",
			//description: "This is a form container that encapsulates simple forms",
			//icon: "page/core/images/form.svg",
			accept: function(type, value) {
				return false;
				if (type == "operation") {
					var operation = $services.swagger.operations[value];
					return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post" || operation.method.toLowerCase() == "patch");         
				}
			},
			initialize: function(type, value, component, cell, row, pageInstance) {
				cell.state.operation = value;
				
				// we need to this auto-update the bindings, not ideal...but for now
				var operation = $services.swagger.operations[value];
				component.updateOperation(operation);
				
				component.generateForm();
				
				var name = $services.page.guessNameFromOperation(value);
				
				// remove the last bit, for example if we have demo.rest.company.create, we want to find an operation
				// that starts with demo.rest.company, for example "demo.rest.company.list"
				var shared = value.replace(/\.[^.]+$/, "");
				var getDataComponent = function(rows) {
					for (var i = 0; i < rows.length; i++) {
						if (rows[i].cells) {
							for (var j = 0; j < rows[i].cells.length; j++) {
								var cell = rows[i].cells[j];
								// do a minimalistic check
								if (cell.alias && cell.alias.indexOf("data-") == 0 && cell.state.operation) {
									if (cell.state.operation.indexOf(shared) == 0) {
										return cell;
									}
								}
								if (cell.rows) {
									var dataComponent = getDataComponent(cell.rows);
									if (dataComponent != null) {
										return dataComponent;
									}
								}
							}
						}
					}
					return null;
				}
				
				var page = pageInstance.page;
				// we scan the current page to see if there is a data component where we can add an event
				if (page.content.rows) {
					var dataComponent = getDataComponent(page.content.rows);
					if (dataComponent != null) {
						nabu.utils.vue.confirm({message:"Do you want to add this form to the existing data cell?"}).then(function() {
							if (name != null) {
								name = name.substring(0, 1).toUpperCase() + name.substring(1);
							}
							// we want the form in a prompt
							cell.target = "prompt";
							
							var operation = $services.swagger.operations[value];
							if (!dataComponent.state.actions) {
								Vue.set(dataComponent.state, "actions", []);
							}
							if (operation.method.toLowerCase() == "post") {
								if (name != null) {
									cell.state.title = "%" + "{Create " + name + "}";
								}
								// make sure we send out a created event once done
								cell.state.event = "created" + (name ? name : "");
								cell.state.ok = "%{Create}";
								// trigger on this create
								cell.on = "create" + (name ? name : "");
								cell.hideMode = "event";
								// push an action to the datacomponent
								dataComponent.state.actions.push({
									name: "create" + (name ? name : ""),
									global: true,
									label: "%" + "{Create}",
									type: "button",
									class: "primary"
								});
								if (!dataComponent.state.refreshOn) {
									Vue.set(dataComponent.state, "refreshOn", []);
								}
								// make sure we refresh on create
								dataComponent.state.refreshOn.push("created" + (name ? name : ""));
							}
							else if (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "patch") {
								if (name != null) {
									cell.state.title = "%" + "{Update " + name + "}";
								}
								// make sure we synchronize changes so we don't need to refresh
								cell.state.synchronize = true;
								cell.state.event = "updated" + (name ? name : "");
								cell.state.ok = "%{Update}";
								// trigger on this create
								cell.on = "update" + (name ? name : "");
								cell.hideMode = "event";
								// push an action to the datacomponent
								dataComponent.state.actions.push({
									name: "update" + (name ? name : ""),
									global: false,
									icon: "fa-pencil-alt",
									type: "button",
									class: "inline"
								});
								// reset events
								pageInstance.resetEvents();
								// allow for some time to stabilize events etc so we have correct definitions
								// not very clean, i know...
								setTimeout(function() {
									// generate automapping of fields
									component.autoMapFrom = cell.on;
									component.automap();
								}, 300);
							}
						});
					}
				}
			}
		});
		
		$services.router.register({
			alias: "page-youtube",
			enter: function(parameters) {
				return new nabu.page.views.Youtube({propsData: parameters});
			}
		});
		
		$services.router.register({
			alias: "page-skeleton-email",
			enter: function(parameters) {
				return new nabu.page.skeletons.Email({propsData: parameters});
			}
		});
		
		// form routes
		$services.router.register({
			alias: "page-form-text",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-text";
				cloneParameters.configurationComponent = "page-form-input-text-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "text",
			category: "Form",
			name: "Text",
			description: "An input field for plain text",
			icon: "page/core/images/form-text.svg"
		});
		$services.router.register({
			alias: "page-form-ace",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-ace";
				cloneParameters.configurationComponent = "page-form-input-ace-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "ace",
			category: "Form",
			name: "Ace",
			description: "An ace editor",
			icon: "page/core/images/form-text.svg"
		});
		$services.router.register({
			alias: "page-form-hidden",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-hidden";
				cloneParameters.configurationComponent = "page-form-input-text-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "hidden",
			category: "Form",
			name: "Hidden",
			description: "An input field with hidden content",
			icon: "page/core/images/form-text.svg"
		});
		$services.router.register({
			alias: "page-form-checkbox",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-checkbox";
				cloneParameters.configurationComponent = "page-form-input-checkbox-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "checkbox",
			category: "Form",
			name: "Checkbox",
			description: "A checkbox that allows you to toggle boolean values",
			icon: "page/core/images/form-checkbox.svg"
		});
		$services.router.register({
			alias: "page-form-enumeration-operation",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-enumeration-operation";
				cloneParameters.configurationComponent = "page-form-input-enumeration-operation-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "enumerationOperation",
			category: "Form",
			name: "Enumeration (Operation)",
			description: "An enumeration based on an operation",
			icon: "page/core/images/enumeration.png"
		});
		$services.router.register({
			alias: "page-form-enumeration-array",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-enumeration-array";
				cloneParameters.configurationComponent = "page-form-input-enumeration-array-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "enumerationArray",
			category: "Form",
			name: "Enumeration (Array)",
			description: "An enumeration based on an array",
			icon: "page/core/images/enumeration.png"
		});
		$services.router.register({
			alias: "page-form-enumeration-provider",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-enumeration-provider";
				cloneParameters.configurationComponent = "page-form-input-enumeration-provider-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "enumerationProvider",
			category: "Form",
			name: "Enumeration (Provider)",
			description: "An enumeration based on a data provider",
			icon: "page/core/images/enumeration.png"
		});
		$services.router.register({
			alias: "page-form-enumeration",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-enumeration";
				cloneParameters.configurationComponent = "page-form-input-enumeration-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "enumeration",
			category: "Form",
			name: "Enumeration (Basic)",
			description: "An enumeration based on fixed values",
			icon: "page/core/images/enumeration.png"
		});
		$services.router.register({
			alias: "page-form-date",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-date";
				cloneParameters.configurationComponent = "page-form-input-date-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "date",
			category: "Form",
			name: "Date",
			description: "A date component with a calendar dropdown",
			icon: "page/core/images/form-date.svg"
		});
		$services.router.register({
			alias: "page-form-switch",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-switch";
				cloneParameters.configurationComponent = "page-form-input-switch-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "switch",
			category: "Form",
			name: "Switch",
			description: "The switch component is a variant on the checkbox to toggle booleans",
			icon: "page/core/images/form-switch.svg"
		});
		$services.router.register({
			alias: "page-form-password",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-password";
				cloneParameters.configurationComponent = "page-form-input-password-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "password",
			category: "Form",
			name: "Password",
			description: "The password component allows for entering the same password twice to verify it",
			icon: "page/core/images/form-password.svg"
		});
		$services.router.register({
			alias: "page-form-richtext",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-richtext";
				cloneParameters.configurationComponent = "page-form-input-richtext-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "richtext",
			category: "Form",
			name: "Rich Text",
			description: "This input component allows you to capture rich text from the user",
			icon: "modules/richtext/logo.svg"
		});
		$services.router.register({
			alias: "page-form-file",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-input-file";
				cloneParameters.configurationComponent = "page-form-input-file-configure";
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "file",
			category: "Form",
			name: "File",
			description: "Upload a file to a REST service with a stream as input",
			icon: "file"
		});
		
		// fragment providers
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-data", 
			configure: "page-field-fragment-data-configure", 
			name: "data",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-text", 
			configure: "page-field-fragment-text-configure", 
			name: "text",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-image", 
			configure: "page-field-fragment-image-configure", 
			name: "image",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-richtext", 
			configure: "page-field-fragment-richtext-configure", 
			name: "richtext",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-javascript", 
			configure: "page-field-fragment-javascript-configure", 
			name: "javascript",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-field-fragment", { 
			component: "page-field-fragment-form", 
			configure: "page-field-fragment-form-configure", 
			name: "form",
			editable: true,
			namespace: "nabu.page"
		});
		
		// form providers
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-richtext", 
			configure: "page-form-input-richtext-configure", 
			name: "richtext",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-page", 
			configure: "page-form-input-page-configure", 
			name: "page",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-text", 
			configure: "page-form-input-text-configure", 
			name: "text",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-hidden", 
			configure: "page-form-input-text-configure", 
			name: "hidden",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-password", 
			configure: "page-form-input-password-configure", 
			name: "password",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-slider", 
			configure: "page-form-input-slider-configure", 
			name: "slider",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-date", 
			configure: "page-form-input-date-configure", 
			name: "date",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-date-picker", 
			configure: "page-form-input-date-picker-configure", 
			name: "date-picker",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-switch", 
			configure: "page-form-input-switch-configure", 
			name: "switch",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-checkbox", 
			configure: "page-form-input-checkbox-configure", 
			name: "checkbox",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration", 
			configure: "page-form-input-enumeration-configure", 
			name: "enumeration",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-provider", 
			configure: "page-form-input-enumeration-provider-configure", 
			name: "enumeration-provider",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-operation", 
			configure: "page-form-input-enumeration-operation-configure", 
			name: "enumeration-operation",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-enumeration-array",
			configure: "page-form-input-enumeration-array-configure", 
			name: "enumeration-array",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-static-image", 
			configure: "page-form-input-static-image-configure", 
			name: "static-image",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-file", 
			configure: "page-form-input-file-configure", 
			name: "file",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-location", 
			configure: "page-form-input-location-configure", 
			name: "location",
			namespace: "google",
			multipleFields: true
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-address", 
			configure: "page-form-input-address-configure", 
			name: "address",
			namespace: "google",
			multipleFields: true
		});
		nabu.page.provide("page-form-input", { 
			component: "page-form-input-validate-custom", 
			configure: "page-form-input-validate-custom-configure",
			name: "validate",
			namespace: "nabu.page",
			multipleFields: true
		});	
		
		// form list providers
		nabu.page.provide("page-form-list-input", { 
			component: "page-form-list-input-dynamic", 
			configure: "page-form-list-input-dynamic-configure", 
			name: "dynamic",
			namespace: "nabu.page"
		});
		nabu.page.provide("page-form-list-input", { 
			component: "page-form-list-input-predefined", 
			configure: "page-form-list-input-predefined-configure", 
			name: "predefined",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-generator", {
			name: "Table Button",
			description: "Add as a delete button to an existing table",
			icon: "th",
			accept: function(type, content) {
				return type == "operation" && $services.swagger.operations[content] && $services.swagger.operations[content].method && $services.swagger.operations[content].method.toLowerCase() == "delete";
			},
			initialize: function(type, content, pageInstance, rowGenerator, cellGenerator) {
				var operation = $services.swagger.operations[content];
				var name = $services.page.guessNameFromOperation(content);
				var rawName = name;
				if (name != null) {
					name = name.substring(0, 1).toUpperCase() + name.substring(1);
				}
				var page = pageInstance.page;
				// remove the last bit, for example if we have demo.rest.company.create, we want to find an operation
				// that starts with demo.rest.company, for example "demo.rest.company.list"
				var shared = content.replace(/\.[^.]+$/, "");
				var getDataComponent = function(targets) {
					for (var i = 0; i < targets.length; i++) {
						var target = targets[i];
						// do a minimalistic check
						if (target.renderer == "repeat" && target.repeat && target.repeat.operation) {
							if (target.repeat.operation.indexOf(shared) == 0) {
								return [target];
							}
						}
						if (target.rows) {
							var dataComponent = getDataComponent(target.rows);
							if (dataComponent != null) {
								dataComponent.push(target);
								return dataComponent;
							}
						}
						else if (target.cells) {
							var dataComponent = getDataComponent(target.cells);
							if (dataComponent != null) {
								dataComponent.push(target);
								return dataComponent;
							}
						}
					}
					return null;
				}
				var dataComponent = getDataComponent(page.content.rows);
				// we are looking for a repeat within a table renderer
				// and it must not have a slot header or footer (if you for some reason put a repeat on that...?)
				if (dataComponent != null && dataComponent.length >= 2 && dataComponent[1].renderer == "table" && ["header", "footer"].indexOf(dataComponent[0].rendererSlot) < 0) {
					var table = dataComponent[1];
					var repeat = dataComponent[0];
					nabu.utils.vue.confirm({message:"Do you want to add a delete button to the existing table?"}).then(function() {
						// find a repeat column that has the name "Local Actions"
						var buttons = repeat.cells.filter(function(x) {
							return x.name && x.name.toLowerCase() == "local actions";
						})[0];
						
						if (!buttons) {
							buttons = cellGenerator(repeat);
							buttons.name = "Local actions";
							// if we add a new column for the buttons, we also need to add it to the header
							var headers = table.rows.filter(function(x) {
								return x.rendererSlot == "header";
							});
							headers.forEach(function(x) {
								var cell = cellGenerator(x);
								cell.name = "Local actions header";
							});
							
							// by default we generate no header content
							// and we set the borders to be disabled on the local actions, that gives it a floaty feeling
							application.services.page.normalizeAris(pageInstance.page, buttons, "cell", [{name:"table-column"}]);
							buttons.aris.components["table-column"].options.push("border_none");
							buttons.aris.components["table-column"].modifiers.push("small");
						}
						var buttonRow = null;
						// if we don't have a row yet, add it
						if (buttons.rows.length == 0) {
							buttonRow = rowGenerator(buttons);
							application.services.page.normalizeAris(pageInstance.page, buttonRow, "row");
							buttonRow.aris.components["page-row"].options.push("gap_small");
							buttonRow.aris.components["page-row"].options.push("wrap_none");
						}
						else {
							buttonRow = buttons.rows[0];
						}
						
						var buttonCell = cellGenerator(buttonRow);
						
						var eventName = "update" + (name ? name : "");
						buttonCell.name = "Delete" + (name ? " " + name : "");
						application.services.page.normalizeAris(pageInstance.page, buttonCell, "cell");
						application.services.page.normalizeAris(pageInstance.page, buttonCell, "cell", [{name:"page-button"}]);
						//buttonCell.aris.components["page-button"].options.push("size_small");
						//buttonCell.aris.components["page-button"].options.push("border_none");
						buttonCell.aris.components["page-button"].variant = "ghost";
						buttonCell.aris.components["page-button"].modifiers.push("danger");
						if (rawName) {
							buttonCell.analysisId = "delete-" + rawName;
						}
						
						buttonCell.alias = "page-button";
						var idField = operation.parameters ? operation.parameters.filter(function(x) {
							return x.name.toLowerCase().indexOf("id") >= 0;
						}).map(function(x) { return x.name })[0] : null;
						var bindings = {};
						if (idField) {
							bindings[idField] = repeat.runtimeAlias + ".record.id";
						}
						buttonCell.state = {
							// no label
							content: null,
							icon: "times"
						}
						buttonCell.triggers = [{
							trigger: "activate",
							actions: [{
								type: "confirmation",
								confirmation: "%" + "{Are you sure you want to delete this entry?}"
							}, {
								type: "operation",
								operation: content,
								bindings: bindings
							}, {
								type: "action",
								action: "refresh",
								actionTarget: repeat.id,
								bindings: {}
							}]
						}]
					});
				}
			}
		});
		
		// -------------------------- generators
		nabu.page.provide("page-generator", {
			name: "Table",
			description: "Generate a table",
			icon: "th",
			accept: function(type, content) {
				return type == "operation" && application.services.page.getArrayOperations().filter(function(x){
					return x.id == content;
				}).length > 0;
			},
			initialize: function(type, content, pageInstance, rowGenerator, cellGenerator) {
				var generator = nabu.page.providers("page-generator").filter(function(x) {
					return x.name.toLowerCase() == "table";
				})[0];
				
				var searchTableRenderer = function(target) {
					if (target.renderer == "table") {
						return target;
					}
					else if (target.cells) {
						return target.cells.filter(function(x) {
							return !!searchTableRenderer(x);
						})[0];
					}
					else if (target.rows) {
						return target.rows.filter(function(x) {
							return !!searchTableRenderer(x);
						})[0];
					}
				}
				
				var availableTemplates = application.services.page.templates.filter(function(x) {
					var content = JSON.parse(x.content);
					return !!searchTableRenderer(content.content);
					/*
					return content.type == "page-cell"
						&& content.content.renderer == "table";
					*/
				});
				
				var name = $services.page.guessNameFromOperation(content);
				if (name != null) {
					name = name.substring(0, 1).toUpperCase() + name.substring(1);
				}
				
				var applyTemplate = function(template) {
					// row at the root of the page
					var row = rowGenerator();
					var root = null;
					if (template.type == "row") {
						root = row;
						application.services.page.normalizeAris(pageInstance.page, row, "row");
						row.name = "Cards";
						row.aris.components["page-row"].variant = "cards";
						var cellContainer = cellGenerator(row);
						cellContainer.name = "Card";
						application.services.page.normalizeAris(pageInstance.page, cellContainer, "cell");
						cellContainer.aris.components["page-column"].variant = "card";
						cellContainer.aris.components["page-column"].options.push("fill_normal");
						root = rowGenerator(cellContainer);
					}
					else {
						// the cell that contains the actual form
						// we use a cell because you might want to show it in a popup etc
						root = cellGenerator(row);
					}
					var templateContent = JSON.parse(template.content).content;
					application.services.page.renumber(pageInstance.page, templateContent);
					// do a reactive merge
					Object.keys(templateContent).forEach(function(key) {
						Vue.set(root, key, templateContent[key]);
					});
					
					var tableTitle = null;
					var tableHeader = null;
					var tableBody = null;
					var tableFilters = null;
					var tableTags = null;

					var search = function(target) {
						if (target.name && target.name.toLowerCase() == "table title") {
							tableTitle = target;	
						}
						if (target.name && target.name.toLowerCase() == "table filters") {
							tableFilters = target;
						}
						if (target.name && target.name.toLowerCase() == "table tags") {
							tableTags = target;
						}
						if (target.renderer == "repeat" && ["header", "footer"].indexOf(target.rendererSlot) < 0) {
							tableBody = target;
						}
						// in a typical scenario the "last" header row is the one that has the most granular columns that likely match the data columns
						// so we don't want to target all headers, just the last one if there are multiple
						if (target.rendererSlot == "header") {
							tableHeader = target;
						}
						if (target.cells) {
							target.cells.forEach(search);
						}
						else if (target.rows) {
							target.rows.forEach(search);
						}
					};
					search(root);
					
					//root.renderer = "table";
					root.name = name + " Table";
					
					if (tableTitle) {
						// this assumes some kind of typography that stores the data in the "content" field or a component compliant with that layout
						tableTitle.state.content = "%" + "{" + name + "}";
					}
					
					var repeatName = "repeat" + name;
					var pickResult = null;
					
					if (tableBody) {
						// not a thing (yet?)
						//tableBody.repeat.repeatType = "operation";
						tableBody.repeat.operation = content;
						tableBody.repeat.loadingPlaceholder = "%" + "{Loading...}";
						tableBody.repeat.emptyPlaceholder = "%" + "{No data available}";
						// by default we allow selection
						tableBody.repeat.selectable = true;
						// and we want to change our content based on the bound input
						tableBody.repeat.enableParameterWatching = true;
						tableBody.runtimeAlias = repeatName;
						tableBody.name = "Table Body " + name;
						pickResult = generator.generateFields(type, content, pageInstance, root, tableBody, tableHeader, rowGenerator, cellGenerator);
					}
					else {
						pickResult = application.services.q.resolve({});
					}
					
					pickResult.then(function(x) {
						if (x.repeatName) {
							repeatName = x.repeatName;
							tableBody.runtimeAlias = x.repeatName;	
						}
						var operation = $services.swagger.operations[content];
						var blacklist = ["limit", "offset", "orderBy", "id", "$serviceContext"];
						if (operation["x-temporary-secret"]) {
							blacklist.push(operation["x-temporary-secret"]);
						}
						if (operation["x-temporary-id"]) {
							blacklist.push(operation["x-temporary-id"]);
						}
						if (tableFilters && operation) {
							var row = tableFilters.cells ? tableFilters : rowGenerator(tableFilters);
							if (operation.parameters) {
								var formGenerator = nabu.page.providers("page-generator").filter(function(x) {
									return x.name.toLowerCase() == "form";
								})[0];
								formGenerator.generateFields("operation", content, pageInstance, repeatName + ".filter", row, rowGenerator, cellGenerator,
									blacklist, 600);
								
								// for search, we want a placeholder instead of label and (at least for text input) a search icon suffix
								row.cells.forEach(function(cell) {
									cell.state.placeholder = cell.state.label == "%" + "{Q}" ? "%" + "{Search}" : cell.state.label;
									cell.state.label = null;
									if (cell.alias == "page-form-text") {
										cell.state.suffixIcon = "search";
									}
								});
							}
						}
						
						if (tableTags) {
							var row = tableTags.cells ? tableTags : rowGenerator(tableTags);
							var tagTemplates = row.cells.filter(function(x) {
								return x.alias == "page-tag";
							});
							// remove them
							tagTemplates.forEach(function(x) {
								row.cells.splice(row.cells.indexOf(x), 1);
							});
							// if there are already cells in the row of the type "page-tag", we remove them
							// they are assumed to be a template of what you want to do with the styling
							if (operation.parameters) {
								operation.parameters.forEach(function(x) {
									if (blacklist.indexOf(x.name) < 0) {
										var cell = cellGenerator(row);
										cell.alias = "page-tag";
										cell.state.field = repeatName + ".filter." + x.name;
										cell.state.content = x.name == "q" ? "%" + "{Search}" : "%" + "{" + x.name.substring(0, 1).toUpperCase() + x.name.substring(1).replace(/([A-Z]+)/g, " $1") + "}";
										
										if (tagTemplates.length == 0) {
											application.services.page.normalizeAris(pageInstance.page, cell, "cell");
											// not rendered yet so we can't read it "live"
											application.services.page.normalizeAris(pageInstance.page, cell, "cell", [{name:"page-tag"}]);
											var options = cell.aris.components["page-tag"].options;
											cell.aris.components["page-tag"].variant = "primary-dark-outline";
											options.push("direction_reverse");
											options.push("decoration_emphasis");
										}
										else {
											cell.aris = tagTemplates[0].aris;
										}
									}
								});
							}
						}
					})
					
				}
				
				if (availableTemplates.length == 0) {
					nabu.utils.vue.confirm({message:"There are no applicable table templates available, add at least one to generate a table"});
					return;
				}
				// just apply it
				else if (availableTemplates.length == 1) {
					applyTemplate(availableTemplates[0]);
				}
				else {
					var selector = Vue.component("page-components-selector");
					nabu.utils.vue.prompt(function() {
						return new selector({propsData: {
							components: availableTemplates
						}});
					}).then(function(chosen) {
						applyTemplate(chosen);
					});
				}
			},
			generateFields: function(type, content, pageInstance, root, body, header, rowGenerator, cellGenerator) {
				var definition = null;
				if (type == "operation") {
					definition = application.services.page.getSwaggerOperationOutputDefinition(content);
					var arrays = application.services.page.getArrays(definition);
					var childDefinition = application.services.page.getChildDefinition(definition, arrays[0]);
					definition = childDefinition && childDefinition.items && childDefinition.items ? childDefinition.items : {};
				}
				else if (type == "array") {
					var pageParameters = null;
					throw "Not implemented page parameter resolving yet";
					var childDefinition = application.services.page.getChildDefinition({properties:pageParameters}, content);
					definition = childDefinition && childDefinition.items && childDefinition.items ? childDefinition.items : {};
				}
				var sortTemplates = header == null ? [] : header.cells.filter(function(x) {
					return x.alias == "page-button-sort";
				});
				// remove from the header
				sortTemplates.forEach(function(x) {
					header.cells.splice(header.cells.indexOf(x), 1);
				});
				var keys = application.services.page.getSimpleKeysFor(definition);
				
				var pickResult = {
					fields: [],
					repeatName: null
				};
				var promise = application.services.q.defer();
				new nabu.utils.vue.prompt(function() {
					var component = Vue.component("data-field-picker");
					return new component({
						propsData: {
							value: pickResult,
							fields: keys
						}
					});
				}).then(function() {
					var repeatName = pickResult.repeatName ? pickResult.repeatName : body.runtimeAlias;
					pickResult.fields.forEach(function(key) {
						// we don't generate a field for the id by default
						if (key != "id") {
							var name = key.replace(/^.*\.([^.]+)$/, "$1");
							var cell = cellGenerator(body);
							var child = application.services.page.getChildDefinition(definition, key);
							cell.alias = "typography-fragment";
							cell.state.content = "{" + name + "}";
							Vue.set(cell.state, "fragments", {});
							Vue.set(cell.state.fragments, name, {
								key: null,
								format: null
							});
							
							cell.state.fragments[name].key = repeatName + ".record." + key;
							
							// set an optional empty thing for mobile rendering
							application.services.page.normalizeAris(pageInstance.page, cell, "cell");
							cell.aris.components["table-column"].modifiers.push("empty");
							cell.aris.components["table-column"].conditions["empty"] = "$value(\"" + repeatName + ".record." + key + "\") == null";
							
							// try to find a more specific alias
							if (child) {
								if (child.type == "integer") {
									cell.state.fragments[name].format = "number";
								}
								else if (child.type == "boolean") {
									cell.state.fragments[name].format = "checkbox";
								}
								else if (child.format && child.format.indexOf("date") >= 0) {
									cell.state.fragments[name].format = "date";
								}
								else if (child.format == "uuid") {
									cell.state.fragments[name].format = "resolve";
									var generator = nabu.page.providers("page-generator").filter(function(x) {
										return x.name.toLowerCase() == "form";
									})[0];
									var operationId = generator.guessListServiceForField(name);
									if (operationId) {
										cell.state.fragments[name].resolveOperation = operationId;
										// we assume some reasonable defaults
										cell.state.fragments[name].resolveOperationId = "id";
										// TODO: verify that there IS a field name, if not, take the first string field or fall back to the id
										cell.state.fragments[name].resolveOperationLabel = "name";
									}
									else {
										cell.state.fragments[name].resolveOperation = "nabu.cms.core.rest.masterdata.entry.resolve";
										cell.state.fragments[name].resolveOperationId = "id";
										cell.state.fragments[name].resolveOperationLabel = "label";
										cell.state.fragments[name].resolveOperationIds = "entryId";
									}
								}
							}
							//cell.name = application.services.page.prettify(name);
							
							var headerCell = cellGenerator(header);
							// names are automatically generated from the content these days
							//headerCell.name = cell.name;
							
							//headerCell.alias = "typography-fragment";
							headerCell.alias = "page-button-sort";
							headerCell.state.content = "%" + "{" + application.services.page.prettify(name) + "}";
							headerCell.state.sortFields = [{
								name: name
							}];
							headerCell.state.target = body.id;
							
							if (sortTemplates.length == 0) {
								application.services.page.normalizeAris(pageInstance.page, headerCell, "cell");
								// not rendered yet so we can't read it "live"
								application.services.page.normalizeAris(pageInstance.page, headerCell, "cell", [{name:"page-button-sort"}]);
								var options = headerCell.aris.components["page-button-sort"].options;
								options.push("direction_reverse");
								headerCell.aris.components["page-button-sort"].variant = "ghost";
							}
							else {
								headerCell.aris = sortTemplates[0].aris;
							}
						}
					});
					promise.resolve(pickResult);
				}, function() {
					// even if you add no fields, we continue generation
					promise.resolve(pickResult);
				});
				return promise;
			}
		});
		nabu.page.provide("page-generator", {
			name: "Form",
			description: "Generates a form that calls this operation",
			icon: "page/core/images/form.svg",
			accept: function(type, content) {
				if (type == "operation") {
					var operation = $services.swagger.operations[content];
					return (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "post" || operation.method.toLowerCase() == "patch");
				}
			},
			automap: function(target, pageInstance, mapFrom) {
				var parameters = application.services.page.getAllAvailableParameters(pageInstance.page, pageInstance);
				var source = application.services.page.getChildDefinition({properties:parameters}, mapFrom);
				var definition = null;
				if (target.form.formType == "operation") {
					definition = application.services.page.getSwaggerOperationInputDefinition(target.form.operation);
				}
				else if (target.form.formType == "array") {
					var pageParameters = null;
					throw "Not implemented page parameter resolving yet";
					var childDefinition = application.services.page.getChildDefinition({properties:pageParameters}, target.form.array);
					definition = childDefinition && childDefinition.items && childDefinition.items ? childDefinition.items : {};
				}
				else if (target.form.formType == "function") {
					definition = application.services.page.getFunctionInput(target.form.function);
				}
				var sourceKeys = application.services.page.getSimpleKeysFor(source);
				var keys = application.services.page.getSimpleKeysFor(definition);
				if (!target.rendererBindings) {
					Vue.set(target, "rendererBindings", {});
				}
				
				// we want to optimize a form update to use the full record -> body mapping if possible
				// the assumption is we are working with an update event that emits the full record, and the form matches that record structure
				// currently we don't validate that the structures match, we just generate it like that
				// in the future we can do further checks or ask the user what they want to generate
				var hasBodyMapping = false;
				// we actually don't split out the non-simple keys so we can't check explicitly for body itself, only for its children
				var hasBodyKey = keys.filter(function(x) { return x.indexOf("body.") == 0 }).length > 0;
				// if we have a body to map to, check if we have a record to map from
				if (hasBodyKey) {
					var recordIndex = sourceKeys.indexOf(mapFrom + ".record");
					var hasRecordKey = sourceKeys.filter(function(x) { return x.indexOf("record.") == 0 }).length > 0;
					if (hasRecordKey) {
						hasBodyMapping = true;
						target.rendererBindings["body"] = mapFrom + ".record";
					}
				}
				
				keys.forEach(function(key) {
					// check that it is not mapped to the body
					var skipMapping = hasBodyMapping && key.indexOf("body.") == 0;
					// if we don't have a binding yet, try to find one in the source
					if (target.rendererBindings[key] == null && !skipMapping) {
						var name = key.replace(/^.*\.([^.]+)$/, "$1");
						var match = sourceKeys.filter(function(x) {
							// ends with...
							return x.length > name.length && x.indexOf("." + name) == x.length - name.length - 1;
						})[0];
						if (match) {
							Vue.set(target.rendererBindings, key, mapFrom + "." + match);
						}
					}
				});
			},
			guessListServiceForField: function(name) {
				name = name.replace(/^.*\.([^.]+)$/, "$1");
				name = name.replace(/^([^.]+)Id$/, "$1");
				return Object.keys(application.services.swagger.operations).filter(function(operationId) {
					return operationId.indexOf("." + name + ".") >= 0 && operationId.indexOf(".list") == operationId.length - ".list".length;
				})[0];
			},
			generateFields: function(type, content, pageInstance, runtimeAlias, fields, rowGenerator, cellGenerator, blacklist, timeout) {
				// if it is not a row, add it as a row
				if (!fields.cells) {
					fields = rowGenerator(fields);
				}
				var definition = null;
				if (type == "operation") {
					definition = application.services.page.getSwaggerOperationInputDefinition(content);
				}
				else if (type == "array") {
					var pageParameters = null;
					throw "Not implemented page parameter resolving yet";
					var childDefinition = application.services.page.getChildDefinition({properties:pageParameters}, content);
					definition = childDefinition && childDefinition.items && childDefinition.items ? childDefinition.items : {};
				}
				else if (type == "function") {
					definition = application.services.page.getFunctionInput(content);
				}
				
				var generator = nabu.page.providers("page-generator").filter(function(x) {
					return x.name.toLowerCase() == "form";
				})[0];
				
				
				var keys = application.services.page.getSimpleKeysFor(definition);
				keys.forEach(function(key) {
					// we don't generate a field for the id by default
					// this should only be available in updates mostly unless you have weird naming conventions
					if (!blacklist || blacklist.indexOf(key) < 0) {
						var cell = cellGenerator(fields);
						var child = application.services.page.getChildDefinition(definition, key);
						cell.alias = "page-form-text";
						// try to find a more specific alias
						if (child) {
							if (child.type == "integer") {
								cell.state.textType = "number";
							}
							else if (child.type == "boolean") {
								cell.alias = "page-form-switch";
							}
							else if (child.format && child.format.indexOf("date") >= 0) {
								cell.alias = "page-form-date";
							}
							else if (child.format == "uuid") {
								cell.alias = "page-form-enumeration-operation";
								var operationId = generator.guessListServiceForField(key);
								if (operationId) {
									cell.state.enumerationOperation = operationId;
									// we assume some reasonable defaults
									cell.state.enumerationOperationValue = "id";
									cell.state.enumerationOperationLabel = "name";
								}
							}
							// if we see a "password" field, use that type
							else if (key.toLowerCase().indexOf("password") >= 0) {
								cell.alias = "page-form-password";
							}
						}
						cell.state.name = runtimeAlias + "." + key;
						var cellName = application.services.page.prettify(key.replace(/^.*\.([^.]+)$/, "$1"));
						//cell.name = cellName;
						cell.state.label = "%" + "{" + cellName + "}";
						if (timeout) {
							cell.state.timeout = timeout;
						}
					}
				});
			},
			// generate into a cell or row
			generate: function(type, content, pageInstance, root, rowGenerator, cellGenerator) {
				var generator = nabu.page.providers("page-generator").filter(function(x) {
					return x.name.toLowerCase() == "form";
				})[0];
				
				var operation = $services.swagger.operations[content];
				var name = $services.page.guessNameFromOperation(content);
				var rawName = name;
				if (name != null) {
					name = name.substring(0, 1).toUpperCase() + name.substring(1);
				}
				
				// we must find the cells that contain the things we want to configure
				var formTitle = null;
				var buttonSubmit = null;
				var buttonCancel = null;
				var buttonClose = null;
				var formFields = null;
				var search = function(target) {
					if (target.name) {
						if (target.name.toLowerCase() == "form title") {
							formTitle = target;	
						}
						else if (target.name.toLowerCase() == "submit button") {
							buttonSubmit = target;
						}
						else if (target.name.toLowerCase() == "cancel button") {
							buttonCancel = target;
						}
						else if (target.name.toLowerCase() == "close button") {
							buttonCancel = target;
						}
						else if (target.name.toLowerCase() == "form fields") {
							formFields = target;
						}
					}
					if (target.cells) {
						target.cells.forEach(search);
					}
					else if (target.rows) {
						target.rows.forEach(search);
					}
				};
				search(root);
				
				root.renderer = "form";
				root.form = {
					formType: "operation",
					operation: content
				};
				
				var title = (name ? name : "");
				if (operation.method.toLowerCase() == "post") {
					root.runtimeAlias = "formCreate" + title;
					title = "Create " + title;
					if (buttonSubmit) {
						buttonSubmit.state.content = "%" + "{Create}";
					}
					if (rawName) {
						root.analysisId = "create-" + rawName;
					}
				}
				else if (operation.method.toLowerCase() == "delete") {
					root.runtimeAlias = "formDelete" + title;
					title = "Delete " + title;
					if (buttonSubmit) {
						buttonSubmit.state.content = "%" + "{Remove}";
					}
					if (rawName) {
						root.analysisId = "delete-" + rawName;
					}
				}
				else {
					root.runtimeAlias = "formUpdate" + title;
					title = "Update " + title;
					if (buttonSubmit) {
						buttonSubmit.state.content = "%" + "{Update}";
					}
					if (rawName) {
						root.analysisId = "update-" + rawName;
					}
				}
				// set the root name if there isn't one yet
				if (root.name == null) {
					root.name = title + "Form";
				}
				
				if (formTitle != null ){
					formTitle.state.content = "%" + "{" + title + "}";
				}
				
				// generate the fields for this form
				// this is likely to be reused later in other settings!
				generator.generateFields(type, content, pageInstance, root.runtimeAlias, formFields, rowGenerator, cellGenerator, ["id", "$serviceContext"]);
				
				// update the submit button so it triggers the submit
				if (buttonSubmit) {
					// use root triggers
					if (!buttonSubmit.triggers) {
						buttonSubmit.triggers = [];
					}
					if (buttonSubmit.triggers.length == 0) {
						buttonSubmit.triggers.push({
							trigger: "activate",
							closeEvent: true,
							actions: []
						})
					}
					var trigger = buttonSubmit.triggers[0];
					var submit = trigger.actions.filter(function(x) { return x.action == "submit" })[0];
					// if we don't have a submit action yet, add it
					if (!submit) {
						trigger.actions.push({
							type: "action",
							actionTarget: root.id,
							action: "submit",
							bindings: {}
						})
					}
					// otherwise, update the id to be in sync
					else {
						submit.actionTarget = root.id;
					}
					trigger.closeEvent = true;
				}

				// remove the last bit, for example if we have demo.rest.company.create, we want to find an operation
				// that starts with demo.rest.company, for example "demo.rest.company.list"
				var shared = content.replace(/\.[^.]+$/, "");
				var getDataComponent = function(targets) {
					for (var i = 0; i < targets.length; i++) {
						var target = targets[i];
						// do a minimalistic check
						if (target.renderer == "repeat" && target.repeat && target.repeat.operation) {
							if (target.repeat.operation.indexOf(shared) == 0) {
								return [target];
							}
						}
						if (target.rows) {
							var dataComponent = getDataComponent(target.rows);
							if (dataComponent != null) {
								dataComponent.push(target);
								return dataComponent;
							}
						}
						else if (target.cells) {
							var dataComponent = getDataComponent(target.cells);
							if (dataComponent != null) {
								dataComponent.push(target);
								return dataComponent;
							}
						}
					}
					return null;
				}
				
				// we scan the current page to see if there is a data component where we can add something
				var page = pageInstance.page;
				if (page.content.rows) {
					var dataComponent = getDataComponent(page.content.rows);
					// we are looking for a repeat within a table renderer
					// and it must not have a slot header or footer (if you for some reason put a repeat on that...?)
					if (dataComponent != null && dataComponent.length >= 2 && dataComponent[1].renderer == "table" && ["header", "footer"].indexOf(dataComponent[0].rendererSlot) < 0) {
						var table = dataComponent[1];
						var repeat = dataComponent[0];
						nabu.utils.vue.confirm({message:"Do you want to add this form to the existing table?"}).then(function() {
							var eventName = null;

							var buttonCell = null;
							
							if (operation.method.toLowerCase() == "post") {
								var tableTemplateRoot = application.services.page.getTemplateRoot(page, table, true);
								var findGlobalActions = function(target) {
									var result = null;
									if (target.name && target.name.toLowerCase() == "global actions") {
										result = target;
									}
									else if (target.cells) {
										target.cells.forEach(function(x) {
											if (!result) {
												result = findGlobalActions(x);
											}
										});
									}
									else if (target.rows) {
										target.rows.forEach(function(x) {
											if (!result) {
												result = findGlobalActions(x);
											}
										});
									}
									return result;
								}
								// find a footer child that has the name "Global Actions"
								/*
								var buttons = table.rows.filter(function(x) {
									return x.name.toLowerCase() == "global actions";
								})[0];
								*/
								buttons = findGlobalActions(tableTemplateRoot);
								console.log("finding global actions", tableTemplateRoot, buttons);
								if (!buttons) {
									buttons = rowGenerator(table);
								}
								eventName = "create" + (name ? name : "");
								buttonCell = cellGenerator(buttons);

								buttonCell.name = "Create" + (name ? " " + name : "");
								
								application.services.page.normalizeAris(pageInstance.page, buttonCell, "cell", [{name:"page-button"}]);
								buttonCell.aris.components["page-button"].variant = "primary";
								
								// make sure we send out a created event once done
/*								dataComponent.state.actions.push({
									name: "create" + (name ? name : ""),
									global: true,
									label: "%" + "{Create}",
									type: "button",
									class: "primary"
								});
								if (!dataComponent.state.refreshOn) {
									Vue.set(dataComponent.state, "refreshOn", []);
								}
								// make sure we refresh on create
								dataComponent.state.refreshOn.push("created" + (name ? name : ""));*/
							}
							else if (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "patch") {
								// find a repeat column that has the name "Local Actions"
								var buttons = repeat.cells.filter(function(x) {
									return x.name && x.name.toLowerCase() == "local actions";
								})[0];
								
								if (!buttons) {
									buttons = cellGenerator(repeat);
									buttons.name = "Local actions";
									// if we add a new column for the buttons, we also need to add it to the header
									var headers = table.rows.filter(function(x) {
										return x.rendererSlot == "header";
									});
									headers.forEach(function(x) {
										var cell = cellGenerator(x);
										cell.name = "Local actions header";
										// render _something_
										cell.alias = "typography-fragment";
									});
									
									// by default we generate no header content
									// and we set the borders to be disabled on the local actions, that gives it a floaty feeling
									application.services.page.normalizeAris(pageInstance.page, buttons, "cell", [{name:"table-column"}]);
									//buttons.aris.components["table-column"].options.push("border_none");
									//buttons.aris.components["table-column"].modifiers.push("small");
									buttons.aris.components["table-column"].variant = "local-actions";
								}
								var buttonRow = null;
								// if we don't have a row yet, add it
								if (buttons.rows.length == 0) {
									buttonRow = rowGenerator(buttons);
									application.services.page.normalizeAris(pageInstance.page, buttonRow, "row");
									//buttonRow.aris.components["page-row"].options.push("gap_small");
									//buttonRow.aris.components["page-row"].options.push("wrap_none");
								}
								else {
									buttonRow = buttons.rows[0];
								}
								
								buttonCell = cellGenerator(buttonRow);
								
								eventName = "update" + (name ? name : "");
								buttonCell.name = "Update" + (name ? " " + name : "");
								application.services.page.normalizeAris(pageInstance.page, buttonCell, "cell");
								application.services.page.normalizeAris(pageInstance.page, buttonCell, "cell", [{name:"page-button"}]);
//								buttonCell.aris.components["page-button"].options.push("size_small");
								buttonCell.aris.components["page-button"].variant = "ghost";
								root.form.synchronize = true;
								
								if (table.aris.components["table"].modifiers.indexOf("has-local-actions") < 0) {
									table.aris.components["table"].modifiers.push("has-local-actions");
								}
								
								// make sure we synchronize changes so we don't need to refresh
								// allow for some time to stabilize events etc so we have correct definitions
								// not very clean, i know...
								if (formFields) {
									setTimeout(function() {
										// generate an automatic mapping for the inputs
										generator.automap(root, pageInstance, eventName);
									}, 300);
								}
							}
							
							// when creating (or deleting), we want to do a refresh
							// because of potential (and likely) paging, we can't simply add the result (even if we got it back)
							if (buttonSubmit && operation.method.toLowerCase() == "post") {
								buttonSubmit.triggers[0].actions.push({
									type: "action",
									action: "refresh",
									actionTarget: repeat.id,
									bindings: {}
								});
							}
							
							if (eventName) {
								root.on = eventName;
								if (!root.state) {
									root.state = {};
								}
								root.state.hideMode = "event";
								// we want the form in a prompt
								root.target = "prompt";
								
								// reset events so it gets picked up
								pageInstance.resetEvents();
							}
							
							if (buttonCell) {
								buttonCell.alias = "page-button";
								buttonCell.state = {
									content: operation.method.toLowerCase() == "post" ? "%" + "{Create}" : null,
									icon: operation.method.toLowerCase() == "post" ? "plus" : "pencil-alt",
								}
								buttonCell.triggers = [{
									trigger: "activate",
									actions: [{
										type: "event",
										event: {
											name: eventName,
											eventFields: []
										}
									}]
								}];
								// we do need to add the current record
								if (operation.method.toLowerCase() == "put" || operation.method.toLowerCase() == "patch") {
									var action = buttonCell.triggers[0].actions[0];
									action.event.eventFields.push({
										name: "record",
										stateValue: repeat.runtimeAlias + ".record"
									});
								}
							}
						});
					}
				}
			},
			initialize: function(type, content, pageInstance, rowGenerator, cellGenerator) {
				var generator = nabu.page.providers("page-generator").filter(function(x) {
					return x.name.toLowerCase() == "form";
				})[0];
				
				
				// TODO: we check all the available templates for forms
				// there should be at least one that is distributed with the core
				// if there is only one, we use immediately, otherwise we let the user choose which templates to use
				// we inject the templates and expect certain cells (with certain names) to be present where we inject stuff
				
				var availableTemplates = application.services.page.templates.filter(function(x) {
					var content = JSON.parse(x.content);
					// in this case we always work cell based
					return content.type == "page-cell"
						&& content.content.renderer == "form";
				});
				
				var applyTemplate = function(template) {
					// row at the root of the page
					var row = rowGenerator();
					// the cell that contains the actual form
					// we use a cell because you might want to show it in a popup etc
					var root = cellGenerator(row);
					var templateContent = JSON.parse(template.content).content;
					application.services.page.renumber(pageInstance.page, templateContent);
					// do a reactive merge
					Object.keys(templateContent).forEach(function(key) {
						Vue.set(root, key, templateContent[key]);
					});
					generator.generate(type, content, pageInstance, root, rowGenerator, cellGenerator);
				}
				
				if (availableTemplates.length == 0) {
					nabu.utils.vue.confirm({message:"There are no applicable form templates available, add at least one to generate a form"});
					return;
				}
				// just apply it
				else if (availableTemplates.length == 1) {
					applyTemplate(availableTemplates[0]);
				}
				else {
					var selector = Vue.component("page-components-selector");
					nabu.utils.vue.prompt(function() {
						return new selector({propsData: {
							components: availableTemplates
						}});
					}).then(function(chosen) {
						applyTemplate(chosen);
					});
				}
				
			}
		});
		
		// renderers, not used up to this point, specification has been made much more powerful
		/*
		nabu.page.provide("page-renderer", {
			name: "slider",
			component: "page-renderer-slider",
			type: "row",
			properties: ["group", "tag"]
		});
		*/
		
		nabu.page.provide("page-type", {
			name: "email",
			pageTag: "e-root",
			rowTag: "e-row",
			cellTag: "e-columns"
		});
		
		// functions
		nabu.page.provide("page-function", {
			id: "page.setAcceptedCookies",
			async: false,
			implementation: function(input, $services, $value, resolve, reject) {
				// we are expecting an object where each key is a boolean true or false
				// alternatively an array is also good
				// if true, the cookie is accepted, if not, it isn't
				var object = input.cookieObject;
				var accepted = [];
				if (object instanceof Array) {
					nabu.utils.arrays.merge(accepted, object);
				}
				else if (object) {
					Object.keys(object).forEach(function(key) {
						if (object[key]) {
							accepted.push(key);
						}
					});
				}
				$services.page.acceptCookies(accepted);
			},
			inputs: [{
				"name": "cookieObject",
				"required": true
			}]
		});
		
		nabu.page.provide("page-icon", {
			name: "Font Awesome",
			html: function(icon, additionalCss) {
				// if you don't include the fa-prefix (of any kind, like fas etc)
				// we assume you want to remain agnostic of the fa prefix and readd it
				// the chance for collission is low and can still be addressed using css
				return "<span class='icon fa " + icon + (additionalCss ? " " + additionalCss : "") + (icon.indexOf("fa") != 0 ? " fa-" + icon : "") + "'></span>";
			},
			priority: -1,
			allowOther: true,
			icons: []
		});
		
		nabu.page.provide("page-format", {
			html: true,
			name: "markdown",
			namespace: "nabu",
			skipCompile: false,
			skipSanitize: false,
			format: function(value, fragment, page, cell, record, updater) {
				if (nabu.formatters && nabu.formatters.markdown) {
					nabu.formatters.markdown.syntaxProviders.form = function(content, parameters) {
						return "<n-form-text v-model='value' label='" + content + "'/><div>test</div>";
					}
					var blocks = nabu.formatters.markdown.parse(value);
					var parameters = {};
					var self = this;
					parameters.tagUrl = "http://google.com?q=";
					parameters.variables = {
						right: "left"
					}
					var result = nabu.formatters.markdown.asHtml(blocks, parameters);
					// if we have promises, we need to do some retroactive resolving
					if (Object.keys(result.promises).length > 0) {
						// we wait until at least this is rendered (just in case we have fast resolving promises)
						Vue.nextTick(function() {
							nabu.formatters.markdown.replacePromises(result.promises);
						})
					}
					return "<article class='is-article'>" + result.content + "</article>";
				}
				return value;
			}
		});
		
		nabu.page.provide("page-format", {
			html: true,
			name: "icon",
			namespace: "nabu",
			skipCompile: false,
			skipSanitize: false,
			format: function(value, fragment, page, cell, record, updater) {
				return value ? "<icon name='" + value + "'/>" : null;
			}
		});
		
		nabu.page.provide("page-format", {
			html: true,
			name: "code",
			namespace: "nabu",
			skipCompile: false,
			skipSanitize: false,
			format: function(value, fragment, page, cell, record, updater) {
				if (nabu.formatters && nabu.formatters.markdown) {
					var format = fragment.codeFormat ? fragment.codeFormat : "";
					nabu.formatters.markdown.syntaxProviders.form = function(content, parameters) {
						return "<n-form-text v-model='value' label='" + content + "'/><div>test</div>";
					}
					var blocks = nabu.formatters.markdown.parse("```" + format + "\n" + value + "\n```");
					var parameters = {};
					var self = this;
					parameters.tagUrl = "http://google.com?q=";
					parameters.variables = {
						right: "left"
					}
					var result = nabu.formatters.markdown.asHtml(blocks, parameters);
					// if we have promises, we need to do some retroactive resolving
					if (Object.keys(result.promises).length > 0) {
						// we wait until at least this is rendered (just in case we have fast resolving promises)
						Vue.nextTick(function() {
							nabu.formatters.markdown.replacePromises(result.promises);
						})
					}
					return "<article class='is-article'>" + result.content + "</article>";
				}
				return value;
			},
			configure: "page-format-code-configure"
		});
		Vue.component("page-format-code-configure", {
			props: {
				page: {
					type: Object,
					required: true
				},
				cell: {
					type: Object,
					required: true
				},
				fragment: {
					type: Object,
					required: true
				}
			},
			template: "<div><n-form-combo v-model='fragment.codeFormat' label='Code format' :items=\"['xml', 'json', 'css', 'sql', 'glue', 'java', 'javascript', 'python']\"/></div>"
		});
		
		
		// formatters
		nabu.page.provide("page-format", {
			format: function(id, fragment, page, cell, record, updater) {
				var properties = {};
				var self = this;
				var pageInstance = $services.page.getPageInstance(page, this);
				if (fragment && fragment.resolveOperationBinding) {
					properties = {};
					Object.keys(fragment.resolveOperationBinding).map(function(key) {
						if (fragment.resolveOperationBinding[key]) {
							// looking inside the current record
							if (fragment.resolveOperationBinding[key].indexOf("record.") == 0) {
								properties[key] = record ? $services.page.getValue(record, fragment.resolveOperationBinding[key].substring("record.".length)) : null;
							}
							else {
								var bindingValue = $services.page.getBindingValue(pageInstance, fragment.resolveOperationBinding[key]);
								properties[key] = bindingValue;
							}
						}
					});
				}
				if (!properties["$serviceContext"]) {
					properties["$serviceContext"] = pageInstance.getServiceContext();
				}
				var result = $services.pageResolver.resolve(fragment.resolveOperation, fragment.resolveOperationIds, fragment.resolveOperationId, id, properties);
				if (result && fragment.resolveOperationLabelComplex) {
					return !fragment.complexLabel ? fragment.complexLabel : $services.typography.replaceVariables(pageInstance, fragment, fragment.complexLabel, $services.q.reject(), result);
				}
				else {
					return result && fragment.resolveOperationLabel ? result[fragment.resolveOperationLabel] : result;
				}
			},
			skipCompile: true,
			html: true,
			configure: "page-format-resolver",
			name: "resolve",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				try {
					var page = new nabu.page.views.Page({
						propsData: {
							embedded: true,
							page: {
								name: "dynamic-page-" + application.services.page.counter++,
								content: application.services.page.normalize(value ? JSON.parse(value) : {})
							}
						}
					});
					return page.$mount().$el;
				}
				catch (exception) {
					return null;
				}
			},
			html: true,
			skipCompile: true,
			name: "page",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				return "<a ref='noopener noreferrer nofollow' href='tel:" + value + "'>" + value + "</a>";
			},
			html: true,
			skipCompile: true,
			name: "phone",
			namespace: "nabu.page"
		});
		
		nabu.page.provide("page-format", {
			format: function(value) {
				return "<a ref='noopener noreferrer nofollow' href='mailto:" + value + "'>" + value + "</a>";
			},
			html: true,
			skipCompile: true,
			name: "email",
			namespace: "nabu.page"
		});
		
		Vue.component("page-percentage-slider-configurator", {
			props: {
				page: {
					type: Object,
					required: true
				},
				cell: {
					type: Object,
					required: true
				},
				fragment: {
					type: Object,
					required: true
				}
			},
			template: "<div><n-form-switch v-model='fragment.percentageReverse' label='Reverse percentage'/><n-form-switch v-model='fragment.percentageSmallRange' label='Is [0-1] range' /><n-form-text v-model='fragment.round' label='Round Number'/></div>"
		});
			
		nabu.page.provide("page-format", {
			format: function(value, fragment, page, cell) {
				if (fragment && fragment.percentageSmallRange && value) {
					value *= 100;
				}
				if (fragment && fragment.percentageReverse && value != null) {
					value = 100 - value;
				}
				if (fragment && fragment.round && value != null) {
					value = parseFloat($services.formatter.number(value, parseInt(fragment.round)));
				}
				// make sure it ends up within the range, otherwise we can't display it well
				// it seems that if you set a negative number, it just takes Math.abs()?
				if (value < 0) {
					value = 0;
				}
				if (value > 100) {
					value = 100;
				}
				return "<input disabled='true' type='range' value='" + value + "' minimum='0' step='1' maximum='100' :value='" + value + "'/>";
			},
			html: true,
			skipCompile: false,
			name: "percentage-slider",
			configure: "page-percentage-slider-configurator",
			namespace: "nabu.page"
		});
		
		return $services.$register({
			page: nabu.page.services.Page,
			pageResolver: nabu.page.services.PageResolver,
			resizer: nabu.page.services.Resizer,
			formatter: nabu.page.services.Formatter
		});
	});
	
});
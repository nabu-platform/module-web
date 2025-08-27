Vue.directive("route-render", {
	// the argument should be the name of the route, any value is passed in as parameters
	// the modifier is interpreted as the anchor to route it to
	// we use the inserted to make sure the parent exists and nextTick to ensure that it is rendered correctly and we have access to __vue__
	inserted: function(element, binding, vnode) {
		Vue.nextTick(function() {
			var keys = binding.modifiers ? Object.keys(binding.modifiers) : null;
			
			var parameters = {
				alias: binding.arg ? binding.arg : binding.value.alias,
				parameters: binding.arg ? binding.value : binding.value.parameters
			}
			
			if (parameters.alias) {
				var result = vnode.context.$services.router.route(parameters.alias, parameters.parameters, element, true);
				
				if (binding.value && binding.value.created) {
					binding.value.created(result);
				}
				
				if (result && result.then) {
					result.then(function(component) {
						element["n-route-component"] = component;
						if (keys && keys.length) {
							if (vnode.context[keys[0]] instanceof Function) {
								vnode.context[keys[0]](component);
							}
							else {
								vnode.context.$refs[keys[0]] = component;
							}
						}
						if (binding.value && binding.value.mounted) {
							binding.value.mounted(component);
						}
						var getParent = function(element) {
							while (element) {
								element = element.parentNode;
								if (element && element.__vue__) {
									return element.__vue__;
								}
							}
							return null;
						}
						var parent = getParent(element);
						if (parent && parent.$children) {
							parent.$children.push(component);
							component.$parent = parent;
						}
						else if (vnode.context.$children) {
							vnode.context.$children.push(component);
							component.$parent = vnode.context;
						}
						if (parent && parent.$root) {
							component.$root = parent.$root;
						}
						else if (vnode.context.$root) {
							component.$root = vnode.context.$root;
						}
					});
				}
				else {
					if (binding.value && binding.value.mounted) {
						binding.value.mounted(result);
					}
				}
				var cloneParameters = function(parameters) {
					var result = {};
					Object.keys(parameters).forEach(function(x) {
						// page and cell are just big...
						if (x != "page" && x != "cell") {	//  && x != "parameters"
							result[x] = parameters[x];
						}
					});
					return result;
				}
				var lightParameters = {
					alias: binding.arg ? binding.arg : binding.value.alias,
					parameters: cloneParameters(binding.arg ? binding.value : binding.value.parameters)
				}
				try {
					element["n-route-render-route-json"] = JSON.stringify(lightParameters);
				}
				catch (exception) {
					console.warn("Could not marshal route render parameters", exception);				
				}
				element["n-route-render-route"] = parameters;
			}
		});
	},
	unbind: function(element, binding, vnode) {
		// cascade a destroy to underlying elements
		var destroy = function(element) {
			for (var i = 0; i < element.childNodes.length; i++) {
				// first recursively destroy any vms that might exist
				if (element.childNodes[i].nodeType == 1) {
					destroy(element.childNodes[i]);
				}
			}
			// then destroy the vm itself (if there is one)
			if (element.__vue__ && element.__vue__.$destroy) {
				element.__vue__.$destroy();
			}
		}
		destroy(element);
	},
	update: function(element, binding, vnode) {
		// the update can be called before the insert + nextTick has initially triggered
		// we only want to re-render if we have rendered in the first place
		// otherwise we can have multiple renders
		// this stripping is currently focused on page-builder, in the future we should extract this to a configurable set of parameters
		// page and cell are just big and shouldn't change operationally...
		// component is for page-arbitrary, we send in the component itself... which is not serializable
		var reserved = ["page", "cell", "component"];		//  "parameters"
		var cloneParameters = function(parameters) {
			var result = {};
			Object.keys(parameters).forEach(function(x) {
				if (reserved.indexOf(x) < 0) {
					result[x] = parameters[x];
				}
			});
			return result;
		}
		if (element["n-route-render-route"]) {
			var keys = binding.modifiers ? Object.keys(binding.modifiers) : null;
		
			var parameters = {
				alias: binding.arg ? binding.arg : binding.value.alias,
				parameters: binding.arg ? binding.value : binding.value.parameters
			}
			
			var lightParameters = {
				alias: binding.arg ? binding.arg : binding.value.alias,
				parameters: cloneParameters(binding.arg ? binding.value : binding.value.parameters)
			}
		
			var stringifiedParameters = null;
			// note that this was added because of page-arbitrary which contains non-serializable parameters
			// should page-arbitrary not update properly, we can have another look at this
			try {
				stringifiedParameters = JSON.stringify(lightParameters);
			}
			catch (exception) {
				console.warn("Could not marshal route render parameters", exception);
			}
			// if we can't stringify the parameters, assume it is not updated
			// otherwise we end up in an infinite update loop
			var isExactCopy = stringifiedParameters == null || element["n-route-render-route-json"] == stringifiedParameters;
		
			if (!isExactCopy) {
				element["n-route-render-route-json"] = stringifiedParameters;
			
				var isSameAlias = element["n-route-render-route"]
					&& element["n-route-render-route"].alias == parameters.alias;
					
					
				// if we have the same alias and only the parameters are different, check if the component supports live loading of new parameters
				// if so, the component can still decide a rerender is necessary
				if (isSameAlias && element["n-route-component"] && element["n-route-component"].setRouteParameters) {
					var rerender = element["n-route-component"].setRouteParameters(parameters.parameters);
					if (!rerender) {
						return null;
					}
				}
			
				// if it is the same alias and the exact same parameters object, the details are already known
				var isSame = isSameAlias
					&& element["n-route-render-route"].parameters == parameters.parameters;
					
				// check the child content of the parameters by reference, maybe the parent is a new object but it contains the same data
				if (!isSame && element["n-route-render-route"] && element["n-route-render-route"].parameters && parameters.parameters) {
					var parameterKeys = Object.keys(parameters.parameters);
					var availableParameterKeys = Object.keys(element["n-route-render-route"].parameters);
					if (parameterKeys.length == availableParameterKeys.length) {
						isSame = true;
						for (var i = 0; i < parameterKeys.length; i++) {
							if (reserved.indexOf(parameterKeys[i]) < 0 && element["n-route-render-route"].parameters[parameterKeys[i]] != parameters.parameters[parameterKeys[i]]) {
								// even if by reference they are different, do an in-depth check
								if (JSON.stringify(element["n-route-render-route"].parameters[parameterKeys[i]]) == JSON.stringify(parameters.parameters[parameterKeys[i]])) {
									continue;
								}
								isSame = false;
								break;
							}
						}
					}
				}

				if (!isSame) {
					element["n-route-render-route"] = parameters;
					if (!binding.value.rerender || binding.value.rerender()) {
						// in a past version, we required a different alias as well before we rerendered
						// perhaps we can do a strict mode?
						var result = vnode.context.$services.router.route(parameters.alias, parameters.parameters, element, true);
						if (binding.value && binding.value.created) {
							binding.value.created(result);
						}
						if (result && result.then) {
							result.then(function(component) {
								
								// remove previous comopnent
								if (element["n-route-component"]) {
									var previousComponent = element["n-route-component"];
									// unregister with the children there
									if (previousComponent.$parent && previousComponent.$parent.$children) {
										var index = previousComponent.$parent.$children.indexOf(previousComponent);
										if (index >= 0) {
											previousComponent.$parent.$children.splice(index, 1);
										}
									}
								}
								
								var getParent = function(element) {
									while (element) {
										element = element.parentNode;
										if (element && element.__vue__) {
											return element.__vue__;
										}
									}
									return null;
								}
								var parent = getParent(element);
								if (parent && parent.$children) {
									parent.$children.push(component);
									component.$parent = parent;
								}
								else if (vnode.context.$children) {
									vnode.context.$children.push(component);
									component.$parent = vnode.context;
								}
								if (parent && parent.$root) {
									component.$root = parent.$root;
								}
								else if (vnode.context.$root) {
									component.$root = vnode.context.$root;
								}
								
								element["n-route-component"] = component;
								if (keys && keys.length) {
									if (vnode.context[keys[0]] instanceof Function) {
										vnode.context[keys[0]](component);
									}
									else {
										vnode.context.$refs[keys[0]] = component;
									}
								}
								if (binding.value.mounted) {
									binding.value.mounted(component);
								}
							});
						}
						else {
							if (binding.value.mounted) {
								binding.value.mounted(result);
							}
						}
					}
				}
			}
		}
	}
});

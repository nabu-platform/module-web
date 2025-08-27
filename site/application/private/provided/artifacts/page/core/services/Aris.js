Vue.service("aris", {
	methods: {
		getAmountOfAppliedOptions: function(container, component) {
			var self = this;
			var modifiers = this.getAvailableModifiers(container, component);
			var activeModifiers = Object.keys(modifiers).filter(function(key) {
				return self.isActiveModifier(container, component, key);
			}).length;
			var dimensions = this.getAvailableDimensions(component);
			var activeOptions = 0;
			dimensions.forEach(function(x) {
				activeOptions += x.options.filter(function(y) {
					return self.isActiveOption(container, component, x, y.name);
				}).length;
			});
			return activeOptions + activeModifiers;
		},
		isActiveModifier: function(container, childComponent, modifier) {
			return container.components[childComponent.name].modifiers.indexOf(modifier) >= 0;
		},
		getAvailableDimensions: function(childComponent) {
			var hierarchy = this.$services.page.getArisComponentHierarchy(childComponent.component);
			var dimensions = [];
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
					})
				}
			});
			// sort the dimensions alphabetically
			dimensions.sort(function(a, b) { return a.name.localeCompare(b.name) });
			return dimensions;
		},
		getAvailableModifiers: function(container, childComponent) {
			var current = container.components[childComponent.name].variant;
			var available = {};
			this.getAvailableVariants(childComponent).filter(function(x) {
				return x.name == "default" || x.name == current;
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
		isActiveOption: function(container, childComponent, dimension, option) {
			return container.components[childComponent.name].options.indexOf(dimension.name + "_" + option) >= 0;
		},
		getAvailableVariants: function(childComponent) {
			var variants = [];
			this.$services.page.getArisComponentHierarchy(childComponent.component).forEach(function(component) {
				if (component.variants != null) {
					component.variants.forEach(function(variant) {
						var clone = JSON.parse(JSON.stringify(variant));
						clone.component = component.name;
						variants.push(clone);
					});
				}
			});
			return variants;
		},
		listActiveOptions: function(container, childComponent, dimension) {
			if (!container || !container.components[childComponent.name]) {
				return [];
			}
			var active = container.components[childComponent.name].options.filter(function(x) {
				return x.indexOf(dimension.name + "_") == 0;
			}).map(function(x) {
				return x.substring((dimension.name + "_").length);
			});
			return active == null ? [] : active;
		},
		listActiveModifiers: function(container, childComponent) {
			var active = container && container.components[childComponent.name] ? container.components[childComponent.name].modifiers : null;
			return active == null ? [] : active;
		},
		listActive: function(container, childComponent) {
			var active = [];
			var self = this;
			nabu.utils.arrays.merge(active, this.listActiveModifiers(container, childComponent).map(function(x) {
				return {
					name: x,
					dimension: "modifier"
				}
			}));
			this.getAvailableDimensions(childComponent).forEach(function(dimension) {
				nabu.utils.arrays.merge(active, self.listActiveOptions(container, childComponent, dimension).map(function(x) {
					return {
						name: x,
						dimension: dimension.name
					}
				}));
			});
			return active.map(function(x) {
				return {
					name: x.name,
					dimension: x.dimension,
					condition: container.components[childComponent.name].conditions[x.dimension + '_' + x.name]
				}
			});
		}
	}
});
// the v-html directive actually allows for self-XSS so switched it to sanitized content
Vue.view("page-tag", {
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
	},  
	name: "Tag",
	category: "Data",
	description: "A tag",
	icon: "link",
	created: function() {
		this.elementPromise = this.$services.q.defer();
	},
	ready: function() {
		this.elementPromise.resolve(this.$el);	
	},
	data: function() {
		return {
			requiresPagePrefix: false,
			running: false
		}
	},
	computed: {
		icon: function() {
			var icon = this.cell.state.icon;
			return icon ? icon : "times";
		},
		computedValue: function() {
			try {
				var instance = this.$services.page.getPageInstance(this.page, this);
				return this.cell.state.useComputed && this.cell.state.computed ? this.$services.page.eval(this.cell.state.computed, {}, this) : null;
			}
			catch(exception) {
				console.error("Could not calculate computed", exception);
				return null;
			}
		}
	},
	methods: {
		getPrettyName: function(target) {
			return this.$services.page.getPrettyNameForTypography(target);
		},
		isCellHidden: function() {
			return this.getValue() == null;	
		},
		reset: function() {
			if (!this.running) {
				var originalValue = this.getRawValue();
				if (this.cell.state.field) {
					// for arrays we simply empty them out rather than deleting them
					if (originalValue instanceof Array) {
						originalValue.splice(0);
					}
					else {
						var pageInstance = this.$services.page.getPageInstance(this.page, this);
						pageInstance.set(this.cell.state.field, null);
						if (this.requiresPagePrefix) {
							pageInstance.set("page." + this.cell.state.field, null);	
						}
					}
				}
				var self = this;
				var done = function() {
					self.running = false;
				};
				this.running = true;
				this.$services.triggerable.trigger(this.cell.state, "remove", {value:originalValue}, this).then(done, done);
			}
		},
		getEvents: function() {
			return this.$services.triggerable.getEvents(this.page, this.cell.state);
		},
		getRawValue: function() {
			var value = null;
			if (this.cell.state.useComputed) {
				value = this.computedValue;
			}
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			value = pageInstance.get(this.cell.state.field);
			if (value == null) {
				value = pageInstance.get("page." + this.cell.state.field);
			}
			return value;
		},
		getValue: function() {
			var value = null;
			if (this.cell.state.useComputed) {
				value = this.computedValue;
			}
			if (this.cell.state.field) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				if (pageInstance) {
					value = pageInstance.getLabel(this.cell.state.field);
					if (value == null) {
						value = pageInstance.getLabel("page." + this.cell.state.field);
						if (value != null) {
							this.requiresPagePrefix = true;
						}
					}
					if (value == null) {
						value = pageInstance.get(this.cell.state.field);
					}
				}
			}
			// an empty array is the same as null!
			if (value instanceof Array && !value.length) {
				value = null;
			}
			// toggle the cell
			if (value != null) {
				this.$emit("show");
			}
			else {
				this.$emit("hide");
			}
			return value;
		},
		getChildComponents: function() {
			return [{
				title: "Tag",
				name: "page-tag",
				component: "badge"
			}]	
		},
		configurator: function() {
			return "page-tag-configure";
		},
		update: function() {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			var self = this;
			if (this.$refs.editor) {
				var last = self.$refs.editor.innerHTML;
				this.timer = setTimeout(function() {
					self.cell.state.content = nabu.utils.elements.sanitize(self.$refs.editor ? self.$refs.editor.innerHTML : last);
				}, 100);
			}
		}
	}
});

Vue.component("page-tag-configure", {
	template: "#page-tag-configure",
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
	},
	methods: {
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
	}
});
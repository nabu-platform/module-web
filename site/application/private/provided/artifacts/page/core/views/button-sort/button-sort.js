/**
 * TODO
 * 
 * Postgresql uses different "nulls first" and "nulls last" logic depending on the direction (asc/desc)
 * This is good enough for now, it is unclear, if we expose it as config, whether you want it to toggle as well or as a fixed value etc
 * 
 * Currently we are going with "reverse appending" for multisort
 * This is a new strategy for us and unclear whether or not this is going to cover all usecases
 * If it does, we leave it as is, otherwise we will offer a configuration to toggle this behavior
 * It is unclear whether this configuration should be at the sort button level or the target level
 */

nabu.page.provide("page-renumberer", {
	component: "page-button-sort",
	renumber: function(target, mapping) {
		// update the action target
		if (target.state.actionTarget != null && mapping[target.state.actionTarget] != null) {
			target.state.actionTarget = mapping[target.state.actionTarget];	
		}
	}
});

Vue.view("page-button-sort", {
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
	name: "Sort button",
	category: "Interactive",
	description: "A button that can be used to sort for example a repeat",
	icon: "link",
	data: function() {
		return {
			timer: null,
			running: false,
			// the component we are sorting on
			component: null,
			currentDirection: null
		}
	},
	created: function() {
		this.elementPromise = this.$services.q.defer();
	},
	mounted: function() {
		this.getComponent();
	},
	ready: function() {
		this.elementPromise.resolve(this.$el);
	},
	watch: {
		"component.state.order.by": function() {
			this.matchOrderBy();
		}
	},
	computed: {
		icon: function() {
			if (this.currentDirection == "asc") {
				return this.cell.state.iconAsc ? this.cell.state.iconAsc : "sort-up";
			}
			else if (this.currentDirection == "desc") {
				return this.cell.state.iconDesc ? this.cell.state.iconDesc : "sort-down";
			}
			else if (this.cell.state.hideNoneIcon) {
				return null;
			}
			return this.cell.state.iconNone ? this.cell.state.iconNone : "sort";
		},
		active: function() {
			var active = false;
			if (this.cell.state.active) {
				active = this.$services.page.isCondition(this.cell.state.active, null, this);
			}
			return active || this.$services.triggerable.getActiveRoutes(this.cell.state).indexOf(this.$services.vue.route) >= 0;
		},
		disabled: function() {
			return this.cell.state.disabled && this.$services.page.isCondition(this.cell.state.disabled, null, this);
		}
	},
	methods: {
		getPrettyName: function(target) {
			return this.$services.page.getPrettyNameForTypography(target);
		},
		getComponent: function() {
			if (this.cell.state.target) {
				var self = this;
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				pageInstance.getComponent(this.cell.state.target).then(function(component) {
					Vue.set(self, 'component', component);
					self.matchOrderBy();
				});
			}
		},
		matchOrderBy: function() {
			if (this.component && this.component.state && this.component.state.order) {
				// get the current order by and adjust our state to match
				var current = this.component.state.order.by;
				
				// we need a correct match for all our fields
				// in other words, if complex sorting ends in an overlap...we don't show any particular state
				
				if (current && this.cell.state.sortFields) {
					var ascMatch = true;
					var descMatch = true;
					var self = this;
					this.cell.state.sortFields.forEach(function(x) {
						// TODO: this does not support nulls first etc syntax yet!
						if (current.indexOf(x.name) < 0 && current.indexOf(x.name + " asc") < 0) {
							ascMatch = false;
						}
						if (current.indexOf(x.name + " desc") < 0) {
							descMatch = false;
						}
					});
					if (ascMatch && descMatch) {
						console.log("Confusing order matching");
					}
					else if (ascMatch) {
						this.currentDirection = "asc";
					}
					else if (descMatch) {
						this.currentDirection = "desc";
					}
				}
			}
		},
		getContentWithVariables: function(content) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return !content ? content : this.$services.typography.replaceVariables(pageInstance, this.cell.state, content, this.elementPromise);
		},
		getChildComponents: function() {
			return [{
				title: "Sort Button",
				name: "page-button-sort",
				component: "button"
			}];
		},
		getEvents: function() {
			var result = {};
			nabu.utils.objects.merge(result, this.$services.triggerable.getEvents(this.page, this.cell.state));

			
			if (nabu.page.event.getName(this.cell.state, "clickEvent") && nabu.page.event.getName(this.cell.state, "clickEvent") != "$close") {
				var type = nabu.page.event.getType(this.cell.state, "clickEvent");
				result[nabu.page.event.getName(this.cell.state, "clickEvent")] = type;
			}
			if (this.cell.state.action && this.cell.state.actionTarget && this.cell.state.actionEvent) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				var output = this.$services.page.getActionOutput(pageInstance, this.cell.state.actionTarget, this.cell.state.action);
				// we may just want marker events without output
				result[this.cell.state.actionEvent] = output ? {properties:output} : {};
			}
			return result;
		},
		handle: function($event) {
			// no direction yet
			if (this.currentDirection == null) {
				this.currentDirection = this.cell.state.reverse ? "desc" : "asc";
			}
			else if (this.currentDirection == "asc") {
				this.currentDirection = this.cell.state.reverse ? null : "desc";
			}
			else if (this.currentDirection == "desc") {
				this.currentDirection = this.cell.state.reverse ? "asc" : null;
			}
			var self = this;
			if (this.cell.state.sortFields && this.component) {
				var orderBy = this.cell.state.sortFields.map(function(x) {
					return x.name + " " + (self.currentDirection ? self.currentDirection : "none");
				});
				this.component.runAction("order-by", {
					by: orderBy,
					append: true
				});
			}
		},
		configurator: function() {
			return "page-button-sort-configure";
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

Vue.component("page-button-sort-configure", {
	template: "#page-button-sort-configure",
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
	created: function() {
		// otherwise not reactive...?
		if (!this.cell.state.sortFields) {
			Vue.set(this.cell.state, "sortFields", []);
		}
	},
	data: function() {
		return {
			component: null,
			fields: []
		}
	},
	mounted: function() {
		this.findTarget();
	},
	methods: {
		findTarget: function() {
			var self = this;
			this.fields.splice(0);
			if (this.cell.state.target) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				pageInstance.getComponent(this.cell.state.target).then(function(component) {
					self.fields.splice(0);
					Vue.set(self, 'component', component);
					component.runAction("list-available").then(function(result) {
						if (result.available) {
							nabu.utils.arrays.merge(self.fields, result.available);
						}
					});
				});
			}
			else {
				Vue.set(self, 'component', null);
			}
		},
		getAvailableFields: function(value) {
			return this.fields.filter(function(x) {
				return !value || x.toLowerCase().indexOf(value.toLowerCase()) >= 0;
			});
		}
	},
	watch: {
		'cell.state.target': function() {
			this.findTarget();
		}
	}
});
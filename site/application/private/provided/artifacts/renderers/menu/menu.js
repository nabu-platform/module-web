nabu.page.provide("page-renderer", {
	title: "Menu",
	name: "menu",
	type: ["row", "cell"],
	component: "renderer-menu",
	configuration: "renderer-menu-configure",
	// can emit events
	// e.g. a success event for form submit
	// an error event
	// a submit event (with the input state)
	getEvents: function(container) {
		var result = {};
		if (container.state && nabu.page.event.getName(container.state, "handledEvent") != null) {
			var type = nabu.page.event.getType(container.state, "handledEvent");
			/* not yet?
			if (type.properties && Object.keys(type.properties).length == 0 && container.on) {
				type = container.on;
			}
			*/
			result[nabu.page.event.getName(container.state, "handledEvent")] = type;
		}
		return result;
	},
	// through the generic "click" trigger, you can already trigger on selecting something in the menu
	getTriggers: function(target, pageInstance, $services) {
		var triggers = {};
		if (target && target.state && target.state.collapsible) {
			triggers.collapse = {
				type: "object"
			}
			triggers.expand = {
				type: "object"
			}
		}
		return triggers;
	},
	// return the child components in play for the given container
	// these can be added to the list of stuff to style
	getChildComponents: function(container) {
		return [{
			title: "Menu",
			name: "renderer-menu",
			component: "menu"
		}];
	},
	getState: function(container, page, pageParameters, $services) {
		var result = {};
		if (container && container.state && container.state.collapsible) {
			result.collapsed = {
				type: "boolean"
			};
		}
		return {properties:result};
	},
	getActions: function(target, pageInstance, $services) {
		var actions = [];
		if (target && target.state && target.state.collapsible) {
			var action = {
				title: "Toggle Collapse",
				name: "toggle-collapse",
				input: {
					collapsed: {
						type: "boolean"
					}
				},
				output: {
				}
			};
			actions.push(action);
		}
		return actions;
	},
	getSlots: function(target) {
		return ["collapsed", "expanded"];
	}
});


Vue.component("renderer-menu", {
	template: "#renderer-menu",
	mixins: [nabu.page.mixins.renderer],
	data: function() {
		return {
			created: false,
			state: {
				collapsed: null
			}
		}
	},
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
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	created: function() {
		this.resetToInitialCollapse();
		this.created = true;
	},
	methods: {
		getPotentialStates: function() {
			return ["collapsed"];
		},
		getCurrentStates: function() {
			var states = [];
			if (this.state.collapsed && !this.edit) {
				states.push("collapsed");
			}
			if (this.$parent) {
				nabu.utils.arrays.merge(states, this.$parent.getCurrentStates())
			}
			return states;
		},
		autoclose: function() {
			if (this.target && this.target.state && this.target.state.collapsible) {
				this.resetToInitialCollapse();
			}
		},
		expand: function() {
			if (this.target && this.target.state && this.target.state.collapsible && this.target.state.expandOnHover && !this.edit) {
				this.state.collapsed = false;
			}	
		},
		collapse: function() {
			if (this.target && this.target.state && this.target.state.collapsible && this.target.state.expandOnHover && !this.edit) {
				this.resetToInitialCollapse();
			}	
		},
		runAction: function(action, value) {
			if (action == "toggle-collapse") {
				var collapsed = value && value.collapsed != null ? value.collapsed : !this.state.collapsed;
				// if the menu is collapsed and this differs from the _default_ state of the menu, the user has done this explicitly, save it
				if (collapsed && !this.getInitialCollapse()) {
					localStorage.setItem(this.page.content.name + "-menu-" + this.target.id + "-collapsed", collapsed);
				}
				// otherwise, reset to normal behavior
				else {
					localStorage.removeItem(this.page.content.name + "-menu-" + this.target.id + "-collapsed");
				}
				if (!collapsed) {
					this.state.collapsed = collapsed;
				}
				// if not collapsing, reset to original
				else {
					// actions are usually explicitly driven by the user
					// this means he might want to explicitly collapse a menu bar that should otherwise be open
					this.resetToInitialCollapse();
				}
			}
		},
		getInitialCollapse: function() {
			var collapsed;
			if (this.target.state.initialCollapsed) {
				collapsed = this.$services.page.isCondition(this.target.state.initialCollapsed, {}, this);
			}
			else {
				collapsed = this.$services.page.device("<=", "tablet");
			}
			return collapsed;
		},
		resetToInitialCollapse: function() {
			if (this.target && this.target.state && this.target.state.collapsible) {
				var collapsed = localStorage.getItem(this.page.content.name + "-menu-" + this.target.id + "-collapsed");
				if (collapsed == null) {
					collapsed = this.getInitialCollapse();
				}
				// string storage
				else {
					collapsed = collapsed === true || collapsed === "true";
				}
				// we switch to numeric to explicitly be different from "true" and "false" which may be set by the user
				this.state.collapsed = collapsed == true ? 1 : 0;
			}
		},
		getRuntimeState: function() {
			return this.state;	
		},
		handle: function() {
			if (this.target && this.target.state && this.target.state.collapsible) {
				// we reset to the initial
				this.resetToInitialCollapse();
			}
			if (nabu.page.event.getName(this.target.state, "handledEvent")) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				// if you have routed away, it may no longer be available
				if (pageInstance) {
					pageInstance.emit(
						nabu.page.event.getName(this.target.state, "handledEvent"),
						nabu.page.event.getInstance(this.target.state, "handledEvent", this.page, this)
					);
				}
			}
		}
	},
	watch: {
		'state.collapsed': function(newValue) {
			if (this.created) {
				if (newValue) {
					this.$services.triggerable.untrigger(this.target, "expand", {}, this);
					this.$services.triggerable.trigger(this.target, "collapse", {}, this);
				}
				else {
					this.$services.triggerable.untrigger(this.target, "collapse", {}, this);
					this.$services.triggerable.trigger(this.target, "expand", {}, this);
				}
			}
		}
	}
});

Vue.component("renderer-menu-configure", {
	template: "#renderer-menu-configure",
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
		// whether or not we are in edit mode (we can do things slightly different)
		edit: {
			type: Boolean,
			required: false
		}
	},
	created: function() {
		if (!this.target.state) {
			Vue.set(this.target, "state", {});
		}
	}
});
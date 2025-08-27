nabu.page.provide("page-renumberer", {
	component: "page-paging",
	renumber: function(target, mapping) {
		// update the action target
		if (target.state.target != null && mapping[target.state.target] != null) {
			target.state.target = mapping[target.state.target];	
		}
	}
});

Vue.view("page-paging", {
	props: {
		page: {
			type: Object,
			required: true
		},
		parameters: {
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
		},
		childComponents: {
			type: Object,
			required: false
		}
	},
	name: "Paging",
	category: "Data",
	icon: "sort-numeric-down",
	description: "Allow you to page through a data set",
	data: function() {
		return {
			// we start with _some_ paging so we see something in edit mode
			paging: {},
			component: null
		}
	},
	// hook into component
	mounted: function() {
		var self = this;
		var pageInstance = this.$services.page.getPageInstance(this.page, this);
		if (this.cell.state.target) {
			pageInstance.getComponent(this.cell.state.target).then(function(component) {
				self.component = component;
				Vue.set(self, "paging", component.getRuntimeState().paging);
				/*component.runAction("get-paging").then(function(paging) {
					// this should be reactive!
					Vue.set(self, "paging", paging);
				});*/
			});
		}
	},
	methods: {
		getChildComponents: function() {
			return [{
				title: "Menu",
				name: "paging-menu",
				description: "The menu that contains the paging buttons",
				component: "menu"
			}, {
				title: "Button",
				name: "paging-button",
				description: "The button used for paging",
				component: "button"
			}];
		},
		load: function(page) {
			if (this.component) {
				var self = this;
				// our paging is already reactive, don't need to update it again
				return this.component.runAction("jump-page", {
					page: page
				});
			}
			return this.$services.q.reject();
		},
		configurator: function() {
			return "page-paging-configure";
		}
	}
});

Vue.component("page-paging-configure", {
	template: "#page-paging-configure",
	props: {
		page: {
			type: Object,
			required: true
		},
		cell: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		},
		childComponents: {
			type: Object,
			required: false
		}
	}
})
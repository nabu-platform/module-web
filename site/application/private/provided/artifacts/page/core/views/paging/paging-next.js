nabu.page.provide("page-renumberer", {
	component: "page-paging-next",
	renumber: function(target, mapping) {
		// update the action target
		if (target.state.target != null && mapping[target.state.target] != null) {
			target.state.target = mapping[target.state.target];	
		}
	}
});

Vue.view("page-paging-next", {
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
	name: "Paging Without Count",
	category: "Data",
	icon: "sort-numeric-down",
	description: "Allow you to page through a data set without a total count",
	data: function() {
		return {
			// we start with _some_ paging so we see something in edit mode
			paging: {},
			component: null,
			loading: false
		}
	},
	computed: {
		pageNumber: function() {
			return this.paging && this.paging.current ? this.paging.current : 0;
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
			},
			{
				title: "Form Field",
				name: "paging-page-number",
				description: "The form field where you can manipulate the page number",
				component: "form-text"
			}];
		},
		load: function(page) {
			if (this.component) {
				var self = this;
				this.loading = true;
				var done = function(x) {
					console.log("loading done", x, self.paging);
					self.loading = false;
				};
				console.log("jumping to page", page);
				// our paging is already reactive, don't need to update it again
				return this.component.runAction("jump-page", {
					page: page
				}).then(done, done);
			}
			return this.$services.q.reject();
		},
		configurator: function() {
			return "page-paging-next-configure";
		}
	},
	watch: {
		'paging.page': function(newValue) {
			console.log("updated to", newValue);
			this.pageNumber = newValue && newValue.current ? newValue.current : 0;
		}
	}
});

Vue.component("page-paging-next-configure", {
	template: "#page-paging-next-configure",
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
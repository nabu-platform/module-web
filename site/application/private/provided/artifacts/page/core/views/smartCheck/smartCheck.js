Vue.view("page-smart-check", {
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
	computed: {
		component: function() {
			return this.cell.state.component ? this.cell.state.component : "n-form-checkbox";
		},
		checked: function() {
			return this.$services.page.isCondition(this.cell.state.checkCondition, {}, this);
		},
		disabled: function() {
			return this.cell.state.disabledCondition ? this.$services.page.isCondition(this.cell.state.disabledCondition, {}, this) : false;
		}
	},
	data: function() {
		return {
			running: false
		}
	},
	methods: {
		configurator: function() {
			return "page-smart-check-configure"
		},
		toggle: function() {
			this.running = true;
			var promise = this.$services.triggerable.trigger(this.cell.state, this.checked ? "clear" : "check", null, this);
			var self = this;
			var done = function() {
				self.running = false;
			}
			promise.then(done, done);
		}
	}
});

Vue.component("page-smart-check-configure", {
	template: "#page-smart-check-configure",
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
	}
})
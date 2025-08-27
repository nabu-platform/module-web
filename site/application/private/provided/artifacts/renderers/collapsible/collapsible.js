nabu.page.provide("page-renderer", {
	title: "Collapsible",
	name: "collapsible",
	type: ["row", "cell"],
	component: "page-collapsible",
	configuration: "page-collapsible-configure",
	// can emit events
	// e.g. a success event for form submit
	// an error event
	// a submit event (with the input state)
	getEvents: function(container) {
		var result = {};
		// TODO: we could emit an event when toggled?
		return result;
	},
	// return the child components in play for the given container
	// these can be added to the list of stuff to style
	getChildComponents: function(container) {
		return [{
			title: "Collapsible Container"	,
			name: "collapsible",
			component: "collapsible"
		}, {
			title: "Title",
			name: "typography",
			component: "content"
		}];
	}
});

Vue.component("page-collapsible", {
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
		target: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	template: "#page-collapsible",
	data: function () {
		return {
			show: false,
			loading: false,
			toggleable: true
		}
	},
	computed: {
		iconOpen: function() {
			return this.target.collapsible && this.target.collapsible.iconOpen ? this.target.collapsible.iconOpen  : 'chevron-up';
		},
		iconClosed: function() {
			return this.target.collapsible && this.target.collapsible.iconClosed ? this.target.collapsible.iconClosed  : 'chevron-down';
		}
	},
	created: function() {
		if (this.target.collapsible.startOpen) {
			this.show = true;
		}
	},
	methods: {
		toggle: function($event) {
			var self = this;
			var closeRest = function() {
				if (self.target.collapsible.closeSiblings) {
					self.$parent.$children.forEach(function(child) {
						if (child.toggle && child.$el.classList.contains("is-collapsible"))	{
							if (child.show) {
								child.toggle();
							}
						}
					});
				}
			}
			if (this.toggleable) {
				if (!this.show) {
					if (this.load) {
						this.loading = true;
						var self = this;
						this.load().then(function() {
							closeRest();
							self.show = true;
							self.loading = false;
							self.$emit("show", self);
						}, function() {
							self.show = false;
							self.loading = false;
							self.$emit("hide", self);
						});
					}
					else {
						closeRest();
						this.show = true;
						this.$emit("show", this);
					}
				}
				else {
					this.show = false;
					this.$emit("hide", this);
				}
				if (this.target.collapsible.stopPropagation && $event) {
					$event.stopPropagation();
					$event.preventDefault();
				}
			}
		},
		checkPrevent: function($event) {
			if (this.target.collapsible.stopPropagation && $event) {
				$event.stopPropagation();
				$event.preventDefault();
			}
		}
	}
});

Vue.component("page-collapsible-configure", {
	template: "#page-collapsible-configure",
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
		target: {
			type: Object,
			required: true
		},
		edit: {
			type: Boolean,
			required: true
		}
	},
	created: function() {
		if (!this.target.collapsible) {
			Vue.set(this.target, "collapsible", {});
		}
	}
});
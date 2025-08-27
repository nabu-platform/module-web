if (!nabu) { var nabu = {} }
if (!nabu.page) { nabu.page = {} }
if (!nabu.page.views) { nabu.page.views = {} }

Vue.view("typography-richtext", {
	template: "#typography-richtext",
	icon: "modules/richtext/logo.svg",
	description: "The rich text component can be used to write static texts with markup",
	name: "Rich Text",
	category: "Typography",
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
		}
	},
	created: function() {
		console.log("editing?", this.edit);
		if (this.edit && !this.cell.state.content) {
			Vue.set(this.cell.state, "content", "");
		}	
	},
	methods: {
		configurator: function() {
			return "typography-richtext-configure";
		},
		update: function(content) {
			if (this.timer) {
				clearTimeout(this.timer);
				this.timer = null;
			}
			var self = this;
			this.timer = setTimeout(function() {
				self.cell.state.content = nabu.utils.elements.sanitize(content);
			}, 100);
		}
	}
});

Vue.view("typography-richtext-configure", {
	template: "#typography-richtext-configure",
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
		}
	}
});


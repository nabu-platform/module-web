Vue.view("page-badge", {
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
	name: "Badge",
	category: "Typography",
	description: "A badge",
	icon: "link",
	created: function() {
		this.elementPromise = this.$services.q.defer();
	},
	ready: function() {
		this.elementPromise.resolve(this.$el);	
	},
	computed: {
		tooltip: function() {
			if (this.cell.state.tooltip) {
				return this.$services.page.interpret(this.$services.page.translate(this.cell.state.tooltip), this);
			}	
		}
	},
	methods: {
		getContentWithVariables: function(content) {
			var pageInstance = this.$services.page.getPageInstance(this.page, this);
			return !content ? content : this.$services.typography.replaceVariables(pageInstance, this.cell.state, content, this.elementPromise);
		},
		getChildComponents: function() {
			return [{
				title: "Badge",
				name: "page-badge",
				component: "badge"
			}]	
		},
		configurator: function() {
			return "page-badge-configure";
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

Vue.component("page-badge-configure", {
	template: "#page-badge-configure",
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
});
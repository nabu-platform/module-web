Vue.component("big-ace", {
	template: "#big-ace",
	props: {
		value: {
			required: false
		},
		mode: {
			type: String,
			required: false,
			default: "javascript"
		}
	},
	created: function() {
		console.log("created with", this.value, this.mode);
	},
	methods: {
		close: function() {
			this.$resolve();
		}
	}
})
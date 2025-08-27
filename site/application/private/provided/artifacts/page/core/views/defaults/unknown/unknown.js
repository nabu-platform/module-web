Vue.view("default-unknown", {
	priority: -50,
	alias: "unknown",
	url: "/unknown",
	props: {
		message: {
			type: String,
			default: "%{default::Sorry, the page you were looking for could not be found.}"
		},
		recover: {
			type: String,
			default: "%{default::Return to the&nbsp;<a class='is-color-link' v-route:home>home page</a>.}"
		}
	}
});
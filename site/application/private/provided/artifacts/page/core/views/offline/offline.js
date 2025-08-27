Vue.view("default-offline", {
	alias: "offline",
	priority: -50,
	url: "/offline",
	props: {
		message: {
			type: String,
			default: "%{Sorry, we're down for scheduled maintenance right now.}"
		},
		recover: {
			type: String,
			default: "%{You can&nbsp;<a class='is-color-link' href='javascript:void()' @click='location.reload()'>retry</a>.}"
		}
	}
});
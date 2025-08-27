Vue.view("default-login", {
	priority: -50,
	alias: "login",
	url: "/login",
	props: {
		route: {
			type: String,
			required: false,
			default: "home"
		},
		url: {
			type: String,
			required: false
		}
	},
	data: function() {
		return {
			username: null,
			password: null,
			// remember will (in the future) be a security-driven choice in the backend
			// the user has little knowledge of what this exactly means with regards to user experience
			// instead he needs to explicitly log out if he wants to be forgotten
			remember: true,
			working: false,
			valid: false,
			messages: []
		};
	},
	methods: {
		login: function() {
			if (this.validate(true)) {
				this.messages.splice(0, this.messages.length);
				this.working = true;
				var self = this;
				return this.$services.user.login(this.username, this.password, this.remember).then(
					function(result) {
						if (result && result.challengeType) {
							// the result should contain a token and a challenge type at this point
							self.$services.router.route("login-challenge", result);
						}
						else if (self.url) {
							window.location.href = self.url;
						}
						else {
							self.$services.router.route(self.route);
						}
						self.working = false;
					},
					function(error) {
						self.messages.push({
							title: self.$services.page.translate("%{default::Login failed}"),
							severity: "error"
						})
						self.working = false;
					});
			}
		},
		validate: function(hard) {
			var messages = this.$refs.form.validate(!hard);
			this.valid = messages.length == 0;
			return this.valid;
		}
	}
});
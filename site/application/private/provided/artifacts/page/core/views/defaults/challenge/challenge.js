Vue.view("default-challenge", {
	priority: -50,
	alias: "login-challenge",
	url: "/login/challenge",
	props: {
		route: {
			type: String,
			required: false,
			default: "home"
		},
		url: {
			type: String,
			required: false
		},
		challengeType: {
			type: String,
			required: false
		},
		token: {
			type: String,
			required: true
		},
		remember: {
			type: Boolean,
			required: false,
			default: true
		}
	},
	data: function() {
		return {
			challenge: null,
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
				return this.$services.user.login(this.token, this.challenge, this.remember, this.challengeType).then(
					function(result) {
						// we might chain challenges (?)
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
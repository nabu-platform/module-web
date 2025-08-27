/**
 * Providers should optionally have these handlers:
 * - start: when the session is first started
 * - stop: when the session is stopped
 * - reauthenticate: when the authentication for the user changes
 * - push(data): an array of data structures, there are a few "reserved" fields
 * 		- event: the event name, for actions this is the actual action name you configured, the most specific
 * 		- type: the event type (e.g. browse, action-trigger (usually by clicking)), we could for example add an "action-validate" in case it triggers validations
 * 		- category: the category of types it belongs to, e.g. everything you can do with an "page action" is in the category "action", e.g. click & hover
 * 		- group: the category this event belongs to (e.g. the page category, or a manually grouped set of buttons)
 * 
 * 
 * Example:
 * 	- event: which button you clicked (e.g. finalize-order)
 *  - type: you clicked a button (button-click)
 * 	- category: you did something with a button (button)
 * 	- group: if you want to combine multiple buttons into a custom grouping for reporting reasons
 */
Vue.service("analysis", {
	// if we wait on the page, we know the user is already loaded as well
	services: ["page"],
	data: function() {
		return {
			provider: null,
			id: 1,
			mobile: application && application.configuration && application && application.configuration.mobile != null ? application && application.configuration.mobile : navigator.userAgent.toLowerCase().indexOf("mobi") >= 0,
			language: application && application.configuration ? application.configuration.language : null,
			timezone: null,
			locale: null
		}
	},
	activate: function(done) {
		this.start();
		if (Intl && Intl.DateTimeFormat	&& Intl.DateTimeFormat().resolvedOptions) {
			this.timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
			this.locale = Intl.DateTimeFormat().resolvedOptions().locale;
		}
		done();
	},
	methods: {
		apply: function(x) {
			nabu.page.providers("page-analysis").forEach(x);
		},
		start: function() {
			this.apply(function(x) {
				if (x.start) {
					x.start();
				}
			});
		},
		stop: function() {
			this.apply(function(x) {
				if (x.stop) {
					x.stop();
				}
			});
		},
		// type: the type of event (e.g. page-action, click,...)
		// name: the specific event, e.g. a specific button
		push: function(data) {
			var self = this;
			// enrich with environmental information
			data.meta = {
				mobile: this.mobile,
				browserLanguage: navigator.language,
				created: new Date().toISOString(),
				url: window.location.href,
				userAgent: navigator.userAgent
			};
			if (document.referrer) {
				data.meta.referrer = document.referrer;
			}
			if (this.language) {
				data.meta.userLanguage = this.language;
			}
			if (this.timezone) {
				data.meta.timezone = this.timezone;
			}
			if (this.locale) {
				data.meta.locale = this.locale;
			}
			data.eventId = this.id++;
			// we add the location if we have it
			if (this.$services.page.location) {
				data.location = this.$services.page.location;
			}
			this.apply(function(x) {
				if (x.push) {
					x.push(data);
				}
			});
			this.$services.page.report("analysis", data.source ? data.source : (data.pageName ? data.pageName : "$anonymous"), data.type, data.event, data);
		}
	},
	// if we upgrade the user credentials, a clear is triggered
	clear: function(done) {
		this.apply(function(x) {
			if (x.reauthenticate) {
				x.reauthenticate();
			}
		});
		done();
	}
});

// stop the session when unloading
// for chrome
window.addEventListener("beforeunload", function(event) {
	if (application.services && application.services.analysis) {
		application.services.analysis.stop();
	}
});

// for not-chrome
window.addEventListener("unload", function(event) {
	if (application.services && application.services.analysis) {
		application.services.analysis.stop();
	}
});


if (!application) { var application = {} }

application.configuration = {
	scheme: {
		http: "${when(environment('secure'), 'https', 'http')}",
		ws: "${when(environment('secure'), 'wss', 'ws')}"
	},
	url: "${when(environment('optimized') == true, 'unavailable', environment('url', 'http://127.0.0.1'))}",
	host: "${when(environment('optimized') == true, 'unavailable', environment('host', '127.0.0.1'))}",
	root: "${when(environment('optimized') == true, 'unavailable', server.root())}",
	cookiePath: "${when(environment('optimized') == true, 'unavailable', environment('cookiePath'))}",
	mobile: navigator.userAgent.toLowerCase().indexOf("mobi") >= 0,
	development: false,
	applicationLanguage: ${when(environment('optimized') == true, '"unavailable"', when(applicationLanguage() != null, '"' + applicationLanguage() + '"', "null"))},
	requestEnrichers: [],
	interpretValues: true,
	// if you always want the user to be logged in, the swagger will redirect to the login if the remember fails
	alwaysLogIn: false
};

if (application.configuration.root == "unavailable") {
	var base = document.head.querySelector("base");
	application.configuration.root = base ? base.getAttribute("href") : "/";
}

application.views = {};
application.components = {};
application.definitions = {};
// a list of loaders that need to be run once the application has been initialized
application.loaders = [];

application.bootstrap = function(handler) {
	// we have already started the services bus, immediately execute the handler
	if (application.services) {
		handler(application.services);
	}
	// add it to the list of other things to be executed
	else {
		application.loaders.push(handler);
	}
};
application.initialize = function() {
	application.services = new nabu.services.ServiceManager({
		mixin: function(services) {
			Vue.mixin({
				// inject some services for use
				computed: {
					$configuration: function() { return application.configuration },
					$services: function() { return services },
					$views: function() { return application.views },
					$application: function() { return application }
				}
			});	
		},
		q: nabu.services.Q,
		cookies: nabu.services.Cookies,
		swagger: application.definitions.Swagger,
		loader: function loader($services) {
			this.$initialize = function() {
				return function(element, clazz) {
					nabu.utils.elements.clear(element);
					var span = document.createElement("span");
					span.setAttribute("class", "n-icon n-icon-spinner fa spinner" + (clazz ? " " + clazz : ""));
					span.setAttribute("style", "display: block; text-align: center");
					element.appendChild(span);
					return span;
				}
			}	
		},
		router: function router($services) {
			this.$initialize = function() {
				return new nabu.services.VueRouter({
					useParents: true,
					useProps: true,
					useHash: ${environment("mobile") == true || !nabu.web.application.Services.information(environment("webApplicationId"))/information/html5Mode},
					unknown: function(alias, parameters, anchor) {
						return $services.router.get("notFound");
					},
					authorizer: function(anchor, newRoute, newParameters) {
						var rolesToCheck = null;
						
						// if the page is login, we always allow it
						// if we would conclude that you can't access it, we would need to redirect to...login?
						// this ends up routing endlessly
						if (newRoute.alias == "login") {
							return true;
						}
						
						// we want to check not only the roles on the target page, but also the parents
						// this allows you to set for instance a $user requirement on a skeleton
						var toCheck = newRoute;
						while (toCheck) {
							if (toCheck.roles) {
								// if we have no role restrictions yet, just use them
								if (rolesToCheck == null) {
									rolesToCheck = toCheck.roles;
								}
								// otherwise, we need to find the common roles
								else {
									rolesToCheck = rolesToCheck.filter(function(x) {
										return toCheck.roles.indexOf(x) >= 0;
									});
								}
							}
							// if we have parents, also check their roles
							if (toCheck.parent) {
								toCheck = $services.router.get(toCheck.parent);
							}
							else {
								break;
							}
						}
						
						if (rolesToCheck && rolesToCheck.length >= 1 && $services.user) {
							if (rolesToCheck.indexOf("$guest") < 0 && !$services.user.loggedIn) {
								$services.vue.attemptedRoute.alias = newRoute.alias;
								$services.vue.attemptedRoute.parameters = newParameters;
								// put it in local storage for later use
								localStorage.setItem("redirect-to", window.location.toString());
								return {
									alias: "login",
									mask: true
								}
							}
							else if ($services.user.hasRole) {
								var hasRole = false;
								for (var i = 0; i < rolesToCheck.length; i++) {
									if ($services.user.hasRole(rolesToCheck[i])) {
										hasRole = true;
										break;
									}
								}
								if (!hasRole) {
									return {
										alias: "home"
									}
								}
							}
							else if (rolesToCheck.indexOf("$user") < 0 && $services.user.loggedIn) {
								return {
									alias: "home"
								}
							}
						}
						if (newRoute.actions && newRoute.actions.length >= 1 && $services.user && $services.user.hasAction) {
							var hasAction = false;
							for (var i = 0; i < newRoute.actions.length; i++) {
								if ($services.user.hasAction(newRoute.actions[i])) {
									hasAction = true;
									break;
								}
							}
							if (!hasAction) {
								return {
									alias: $services.user.loggedIn ? "home" : "login"
								}
							}
						}
					},
					chosen: function(anchor, newRoute, newParameters) {
						if (anchor && (newRoute.slow || (newParameters != null && newParameters.slow))) {
							
							nabu.utils.vue.render({
								target: anchor,
								content: "<div class='page-loader-inline-container'><div class='page-loader'></div></div>"
							});
						}	
					},
					enter: function(anchor, newRoute, newParameters, newRouteReturn, mask) {
						if (!mask && newRoute.url) {
							// keep previous state so we know where we came from
							$services.vue.previousRoute = $services.vue.lastRoute;
							$services.vue.route = newRoute.alias;
							$services.vue.parameters = newParameters;
							$services.page.chosenRoute = newRoute.alias;
							$services.vue.lastRoute = newRoute;
							// reset scroll
							// document.body.scrollTop = 0;
							window.scrollTo(0, 0);
						}
					}
				});
			}
		},
		vue: function vue() {
			this.$initialize = function() {
				return new Vue({
					el: "body",
					data: function() {
						return {
							route: null,
							parameters: null,
							lastRoute: null,
							attemptedRoute: {}
						}
					},
					methods: {
						updateUrlParameter: function(key, value) {
							if (this.lastRoute != null) {
								var parameters = this.lastRoute.parameters ? nabu.utils.objects.clone(this.lastRoute.parameters) : {};
								parameters[key] = value;
								var url = this.$services.router.router.template(this.lastRoute.alias, parameters);
								// only update if we have _some_ url
								if (url) {
									this.$services.router.router.updateUrl(
										this.lastRoute.alias,
										url,
										parameters,
										this.lastRoute.query);
								}
							}
						}
					}
				});
			}
		},
		routes: application.routes,
		loaders: function($services) {
			this.$initialize = function() {
				var promises = [];
				for (var i = 0; i < application.loaders.length; i++) {
					var result = application.loaders[i]($services);
					if (result && result.then) {
						promises.push(result);
					}
				}
				return $services.q.all(promises);
			}
		}
	});
	return application.services.$initialize();
};
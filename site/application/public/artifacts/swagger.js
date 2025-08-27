if (!application) { var application = {} };
if (!application.definitions) { application.definitions = {} }

application.definitions.Swagger = function($services) {
	
	var swaggerPath = (application && application.configuration ? application.configuration.root : "/") + "swagger.json";
	
	this.$initialize = function() {
		var promise = $services.q.defer();
		var service = new nabu.services.SwaggerClient({
			remember: function() {
				if ($services.user && $services.user.remember) {
					return $services.user.remember().then(function() {
						// do nothing extra on success
					}, function() {
						if (application.configuration.alwaysLogIn) {
							// on failure, we want to reroute to the login page, there are very few ways to recover properly
							setTimeout(function() {
								$services.router.route("login");
							}, 1);
						}
					});
				}
				else {
					var promise = $services.q.defer();
					promise.reject();
					return promise;
				}
			},
			parseError: true
		});
		promise.stage(service);
		
		nabu.utils.ajax({
			cache: true,
			url: swaggerPath,
			bearer: $services.user != null ? $services.user.bearer : null
		}).then(function(response) {
			service.loadDefinition(response.responseText);
			service.$clear = function() {
				return nabu.utils.ajax({
					url: swaggerPath,
					bearer: $services.user != null ? $services.user.bearer : null
				}).then(function(response) {
					service.loadDefinition(response.responseText);	
				});
			}
			promise.resolve(service);
		}, function(error) {
			promise.reject(error);	
		});
		return promise;
	}
}
if (!nabu) { var nabu = {}; }
if (!nabu.services) { nabu.services = {}; }

nabu.services.VueService = function(component, parameters) {
	component.render = function(done) {
		// do nothing, a service has no DOM presence
		return done();
	}
	
	var service = function($services) {
		var activate = function(instance) {
			var callActivated = function() {
				// call the activated hook
				if (instance.$options.activated) {
					var activated = instance.$options.activated instanceof Array ? instance.$options.activated : [instance.$options.activated];
					for (var i = 0; i < activated.length; i++) {
						activated[i].call(instance);
					}
				}
			};
			if (instance.$options && instance.$options.activate) {
				if (instance.$options.activate instanceof Array) {
					var promises = [];
					var process = function(activation) {
						var promise = $services.q.defer();
						promises.push(promise);
						var done = function(result) {
							promise.resolve(result);
						};
						activation.call(instance, done);
					}
					for (var i = 0; i < instance.$options.activate.length; i++) {
						process(instance.$options.activate[i]);
					}
					var resultingPromise = $services.q.defer();
					$services.q.all(promises).then(function(x) {
						callActivated();
						var resultingService = null;
						if (x) {
							for (var i = 0; i < x.length; i++) {
								if (x[i]) {
									resultingService = x[i];
								}
							}
						}
						// don't allow a service instance to be returned in the done by default
						//resultingPromise.resolve(resultingService ? resultingService : instance);
						resultingPromise.resolve(instance);
					}, resultingPromise);
					return resultingPromise;
				}
				else {
					var promise = $services.q.defer();
					var done = function(result) {
						callActivated();
						// don't allow a service instance to be returned in the done by default
						//promise.resolve(result ? result : instance);
						promise.resolve(instance);
					};
					instance.$options.activate.call(instance, done);
					return promise;
				}
			}
			else {
				var promise = $services.q.defer();
				callActivated();
				promise.resolve(instance);
				return promise;
			}
		};
		
		this.$initialize = function() {
			var instance = new component({ data: { "$services": $services }});
			if (instance.$options.clear) {
				instance.$clear = function() {
					var clears = instance.$options.clear instanceof Array ? instance.$options.clear : [instance.$options.clear];
					var promises = [];
					var callClear = function(clear) {
						var promise = new nabu.utils.promise();
						var done = function() {
							promise.resolve();
						};
						clear.call(instance, done);
						return promise;
					};
					for (var i = 0; i < clears.length; i++) {
						promises.push(callClear(clears[i]));
					}
					return new nabu.utils.promises(promises);
				}
			}
			if (instance.$options.switchLanguage) {
				instance.$switchLanguage = function() {
					var switchLanguages = instance.$options.switchLanguage instanceof Array ? instance.$options.switchLanguage : [instance.$options.switchLanguage];
					var promises = [];
					var callSwitchLanguage = function(switchLanguage) {
						var promise = new nabu.utils.promise();
						var done = function() {
							promise.resolve();
						};
						switchLanguage.call(instance, done);
						return promise;
					};
					for (var i = 0; i < switchLanguages.length; i++) {
						promises.push(callSwitchLanguage(switchLanguages[i]));
					}
					return new nabu.utils.promises(promises);
				}
			}
			if (parameters && parameters.lazy) {
				instance.$lazy = function() {
					if (!instance.$lazyInitialized) {
						instance.$lazyInitialized = new Date();
						return activate(instance);
					}
					else {
						var promise = $services.q.defer();
						promise.resolve(instance);
						return promise;
					}
				};
			}
			if (!parameters || !parameters.lazy) {
				var serviceDependencies = [];
				if (instance.$options.services) {
					nabu.utils.arrays.merge(serviceDependencies, instance.$options.services);
				}
				if (instance.$options.optionalServices) {
					instance.$options.optionalServices.forEach(function(x) {
						serviceDependencies.push({
							name: x,
							optional: true
						})
					});
				}
				// if we have service dependencies, make sure they are loaded first
				if (serviceDependencies.length) {
					var promises = [];
					for (var i = 0; i < serviceDependencies.length; i++) {
						// this is either a string (this was the case for quite a long time)
						// or an object with a "name" and an "optional" field to indicate whether the service is absolutely necessary
						var serviceDependency = serviceDependencies[i];
						var promise = $services.$promise(serviceDependency.name ? serviceDependency.name : serviceDependency, serviceDependency.optional);
						if (!promise) {
							throw "Could not find service dependency: " + serviceDependencies[i];
						}
						promises.push(promise);
					}
					var promise = new nabu.utils.promise();
					promise.stage(instance);
					new nabu.utils.promises(promises).then(function() {
						// create a new instance
						// this service may have dependencies in the form of watchers, computed properties... to remote services
						// these are not set up correctly if they are not available at creation time
						// @2017-11-07: we use promise staging now to preemtively send back the instance preventing the need for double creation
						//instance = new component({ data: { "$services": $services }});
						activate(instance).then(promise, promise);
					});
					return promise;
				}
				else {
					return activate(instance);
				}
			}
			else {
				return instance;
			}
		}
		
	}
	
	if (parameters && parameters.name) {
		var parts = parameters.name.split(".");
		var target = window;
		for (var i = 0; i < parts.length - 1; i++) {
			if (!target[parts[i]]) {
				target[parts[i]] = {};
			}
			target = target[parts[i]];
		}
		target[parts[parts.length - 1]] = service;
	}
	
	return service;
}

// mixin an activation sequence for lazy service loading
Vue.mixin({
	initialize: function(done) {
		var serviceDependencies = [];
		if (this.$options.services) {
			nabu.utils.arrays.merge(serviceDependencies, this.$options.services);
		}
		if (this.$options.optionalServices) {
			this.$options.optionalServices.forEach(function(x) {
				serviceDependencies.push({
					name: x,
					optional: true
				})
			});
		}
		if (serviceDependencies.length) {
			if (!this.$services) {
				throw "No service provider found";
			}
			var promises = [];
			for (var i = 0; i < serviceDependencies.length; i++) {
				var name = serviceDependencies[i].name ? serviceDependencies[i].name : serviceDependencies[i].split(".");
				var target = this.$services;
				for (var j = 0; j < name.length; j++) {
					if (!target) {
						throw "Could not find service: " + this.$options.services[i];
					}
					target = target[name[j]];
				}
				if (!target.$lazyInitialized && target.$lazy) {
					var result = target.$lazy();
					if (result.then) {
						promises.push(result); 
					}
				}
			}
			this.$services.q.all(promises).then(function() {
				done();
			});
		}
		else {
			done();
		}
	}
});
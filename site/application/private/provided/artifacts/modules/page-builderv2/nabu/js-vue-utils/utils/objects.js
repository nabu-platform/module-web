if (!nabu) { nabu = {}; }
if (!nabu.vue) { nabu.vue = {}; }

nabu.vue.objects = {
	merge: function(original) {
		if (original instanceof Array) {
			var args = [];
			// the arguments aren't really an array, can't use default merge stuff
			for (var i = 1; i < arguments.length; i++) {
				args.push(arguments[i]);
			}
			// for each entry in the original, perform a merge
			for (var i = 0; i < original.length; i++) {
				args.unshift(original[i]);
				nabu.vue.objects.merge.apply(null, args);
				args.shift();
			}
		}
		else {
			for (var i = 1; i < arguments.length; i++) {
				if (arguments[i]) {
					var overwrite = typeof(arguments[i].$overwrite) == "undefined" ? true : arguments[i].$overwrite;
					for (var key in arguments[i]) {
						if (key == "$overwrite") {
							continue;
						}
						if (arguments[i][key] instanceof Array) {
							if (overwrite) {
								original[key] = arguments[i][key];
							}
							else {
								if (!original[key]) {
									original[key] = [];
								}
								nabu.vue.arrays.merge(original[key], arguments[i][key]);
							}
						}
						// typeof(null) is object
						else if (typeof arguments[i][key] == "object" && arguments[i][key] != null && !(arguments[i][key] instanceof Date)) {
							if (!original[key]) {
								Vue.set(original, key, arguments[i][key]);
							}
							else {
								nabu.vue.objects.merge(original[key], arguments[i][key]);
							}
						}
						else if (typeof arguments[i][key] != "undefined") {
							if (!original[key] || overwrite) {
								Vue.set(original, key, arguments[i][key]);
							}
						}
					}
				}
			}
		}
	}
}
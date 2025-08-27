nabu.services.VueService(Vue.extend({
	methods: {
		round: function(number, amountOfDecimals) {
			var multiplier = Math.pow(10, amountOfDecimals);
			return Math.round(number * multiplier) / multiplier;
		},
		format: function(value, properties, page, cell, record, component) {
			if (!properties.format) {
				return value;
			}
			else if (properties.format == "checkbox") {
				return "<n-form-checkbox :value='value' />";
			}
			else if (value == null || typeof(value) == "undefined") {
				return null;
			}
			// formatting is optional
			else if (!properties.format || properties.format == "text") {
				return value;
			}
			else if (properties.format == "html") {
				return properties.html ? properties.html : value;
			}
			else if (properties.format == "link") {
				return "<a target='_blank' class='is-button is-variant-link is-spacing-none' ref='noopener noreferrer nofollow' href='" + value + "'>" + value.replace(/http[s]*:\/\/([^/]+).*/, "$1") + "</a>";
			}
			else if (properties.format == "date") {
				if (value && properties.isTimestamp) {
					value = new Date(value);
				}
				else if (value && properties.isSecondsTimestamp) {
					value = new Date(1000 * value);
				}
				return this.date(value, properties.dateFormat);
			}
			// backwards compatibility
			else if (properties.format == "dateTime") {
				return this.date(value, "dateTime");
			}
			else if (properties.format == "number") {
				return this.number(value, properties.amountOfDecimals, properties.retainTrailing);
			}
			else if (properties.format == "masterdata") {
				var serviceContext = null;
				if (component && component.page) {
					var pageInstance = this.$services.page.getPageInstance(component.page, component);
					serviceContext = pageInstance == null ? null : pageInstance.getServiceContext();
				}
				// we take the default field (title) which should be translated!
				return this.masterdata(value, serviceContext);
			}
			else if (properties.format == "javascript") {
				return this.javascript(value, properties.javascript, properties.state, properties.$value);
			}
			// otherwise we are using a provider
			else {
				var result = nabu.page.providers("page-format").filter(function(x) { return x.name == properties.format })[0]
					.format(value, properties, page, cell, record, component);
				return result;
			}
		},
		javascript: function(value, code, state, $value) {
			var $services = this.$services;
			if (code instanceof Function) {
				return code(value);
			}
			else {
				var result = (new Function('with(this) { return ' + code + ' }')).call({
					value: value,
					$value: $value,
					state: state,
					$services: this.$services
				});
				//var result = eval(code);
				if (result instanceof Function) {
					result = result.bind(this);
					result = result(value);
				}
				return result;
			}
		},
		date: function(date, format) {
			if (date instanceof Array) {
				var self = this;
				return date.map(function(single) {
					return self.date(single, format);
				});
			}
			else {
				if (!date) {
					return null;
				}
				else if (typeof(date) == "string") {
					date = new Date(date);
				}
				if (!format || format == "date") {
					format = "yyyy-MM-dd";
				}
				else if (format == "dateTime") {
					format = "yyyy-MM-ddTHH:mm:ss.SSS";
				}
				else if (format == "locale-date" && date.toLocaleDateString) {
					return date.toLocaleDateString();
				}
				else if (format == "locale-time" && date.toLocaleTimeString) {
					return date.toLocaleTimeString();
				}
				else if (format.indexOf("locale-time-") == 0) {
					format = format.substring("locale-time-".length);
					var parameters = {};
					var amountOfHours = format.length - format.replace(/h/g, "").length;
					if (amountOfHours == 1) {
						parameters.hour = "numeric";
					}
					else if (amountOfHours >= 2) {
						parameters.hour = amountOfHours + "-digit";
					}
					var amountOfMinutes = format.length - format.replace(/m/g, "").length;
					if (amountOfMinutes == 1) {
						parameters.minute = "numeric";
					}
					else if (amountOfMinutes >= 2) {
						parameters.minute = amountOfMinutes + "-digit";
					}
					var amountOfSeconds = format.length - format.replace(/s/g, "").length;
					if (amountOfSeconds == 1) {
						parameters.second = "numeric";
					}
					else if (amountOfSeconds >= 2) {
						parameters.second = amountOfSeconds + "-digit";
					}
					return new Date().toLocaleTimeString([], parameters);
				}
				else if (format == "locale" && date.toLocaleString) {
					return date.toLocaleString();
				}
				
				format = format.replace(/yyyy/g, date.getFullYear());
				format = format.replace(/yy/g, ("" + date.getFullYear()).substring(2, 4));
				format = format.replace(/dd/g, (date.getDate() < 10 ? "0" : "") + date.getDate());
				format = format.replace(/d/g, date.getDate());
				format = format.replace(/HH/g, (date.getHours() < 10 ? "0" : "") + date.getHours());
				format = format.replace(/H/g, date.getHours());
				format = format.replace(/mm/g, (date.getMinutes() < 10 ? "0" : "") + date.getMinutes());
				format = format.replace(/m/g, date.getMinutes());
				format = format.replace(/ss/g, (date.getSeconds() < 10 ? "0" : "") + date.getSeconds());
				format = format.replace(/s/g, date.getSeconds());
				format = format.replace(/[S]+/g, date.getMilliseconds());
				// we get an offset in minutes
				format = format.replace(/[X]+/g, Math.floor(date.getTimezoneOffset() / 60) + ":" + date.getTimezoneOffset() % 60);
				// do months last as they can introduce named months which might conflict with expressions in the above
				// e.g. "Sep" could trigger the millisecond replacement
				// replacing a month with "May" could trigger the single "M" replacement though
				// so first we replace the capital M with something that should never conflict
				if (nabu.utils.dates.days) {
					format = format.replace(/E/g, "#");
				}
				format = format.replace(/M/g, "=");
				format = format.replace(/====/g, this.$services.page.translate(nabu.utils.dates.months()[date.getMonth()]));
				format = format.replace(/===/g, this.$services.page.translate(nabu.utils.dates.months()[date.getMonth()]).substring(0, 3));
				format = format.replace(/==/g, (date.getMonth() < 9 ? "0" : "") + (date.getMonth() + 1));
				format = format.replace(/=/g, date.getMonth() + 1);
				
				// this was added later, hence the defensive check for projects that don't have this yet
				if (nabu.utils.dates.days) {
					format = format.replace(/####/g, this.$services.page.translate(nabu.utils.dates.days()[nabu.utils.dates.dayOfWeek(date)]));
					format = format.replace(/###/g, this.$services.page.translate(nabu.utils.dates.days()[nabu.utils.dates.dayOfWeek(date)]).substring(0, 3));   
				}
				format = format.replace(/##/g, (nabu.utils.dates.dayOfWeek(date) < 9 ? "0" : "") + (nabu.utils.dates.dayOfWeek(date) + 1));
				format = format.replace(/#/g, nabu.utils.dates.dayOfWeek(date) + 1);
				return format;
			}
		},
		masterdata: function(id, serviceContext) {
			if (!id) {
				return "";
			}
			var entry = this.$services.masterdata.entry(id);
			if (entry) {
				return entry.title ? entry.title : entry.name;
			}
			var category = this.$services.masterdata.category(id);
			if (category) {
				return category.title ? category.title : category.name;
			}
			return this.$services.masterdata.resolve(id, null, serviceContext);
		},
		number: function(input, amountOfDecimals, retainTrailing) {
			amountOfDecimals = amountOfDecimals == null ? 2 : parseInt(amountOfDecimals);
			if (typeof(input) != "number") {
				input = parseFloat(input);
			}
            var options = {};
            // we used to use toFixed, but it does do rounding, it just cuts off
            options.minimumFractionDigits = retainTrailing ? amountOfDecimals : 0;
            options.maximumFractionDigits = amountOfDecimals;
            return Number(input).toLocaleString(this.$services.page.getLocale(), options);
		},
		conventionize: function(value) {
			// we currently assume from lower camelcase to word
			return value.substring(0, 1).toUpperCase() + value.substring(1).replace(/([A-Z]+)/g, " $1");
		}
	}
}), { name: "nabu.page.services.Formatter" });
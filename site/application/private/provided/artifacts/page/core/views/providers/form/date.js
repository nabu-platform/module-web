Vue.component("page-form-input-date-configure", {
	template: "<div><h2 class='section-title'>Date field</h2><div class='is-column is-spacing-medium'>"
		+ "	<n-form-switch v-model='field.yearsDropdown' label='Show years in dropdown'/>"
		+ "	<n-form-switch v-model='field.includeHours' label='Include hours?'/>"
		+ "	<n-form-switch v-model='field.includeMinutes' label='Include minutes?' v-if='field.includeHours'/>"
		+ "	<n-form-switch v-model='field.includeSeconds' label='Include seconds?' v-if='field.includeHours && field.includeMinutes'/>"
		+ "	<n-form-switch v-model='field.localTime' label='Use local time' v-if='field.includeHours'/>"
		+ "	<n-form-switch v-model='field.isTimestamp' label='Is a timestamp in milliseconds?' v-if='!field.isSecondsTimestamp'/>"
		+ "	<n-form-switch v-model='field.isSecondsTimestamp' label='Is a timestamp in seconds?' v-if='!field.isTimestamp'/>"
		+ "	<n-form-text v-model='field.regexLabel' label='Regex label'/>"
		+ "	<n-form-text v-model='field.dateFormat' label='Date Format'/>"
		+ "	<n-form-text v-model='field.info' label='Info Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffix' label='Suffix' v-if='!field.suffixIcon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' v-if='!field.suffix' :timeout='600'/>"
		+ "	<n-form-ace v-model='field.allowFunction' label='Allow function' :timeout='600'/>"
		+ "	<n-form-text v-model='field.yearsFrom' label='List years from (e.g. -18)' :timeout='600'/>"
		+ "	<n-form-text v-model='field.yearsTo' label='List years until (e.g. 18)' :timeout='600'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='field.dateFormat ? [\"allow\", \"default\"] : [\"allow\", \"default\",\"formatter\",\"parser\"]'/>"
		+ "</div></div>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		// the fragment this image is in
		field: {
			type: Object,
			required: true
		}
	},
	created: function () {
		if (!this.field.bindings) {
			Vue.set(this.field, "bindings", {});
		}
	},
	computed: {
		availableParameters: function() {
			return this.$services.page.getAvailableParameters(this.page, this.cell, true);
		}
	}
});

Vue.component("page-form-input-date", {
	template: "<n-form-date ref='form'"
			+ "		:placeholder='placeholder'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		v-bubble:label"
			+ "		v-bubble:input"
			+ "		:local-time='field.localTime'"
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:default='getDefault()'"
			+ "		:timeout='timeout'"
			+ "		v-bubble:blur"
			+ "		:allow='getAllow()'"
			+ "		:info='field.info ? $services.page.interpret($services.page.translate(field.info), $self) : null'"
			+ "		:before='field.before ? $services.page.translate(field.before) : null'"
			+ "		:after='field.after ? $services.page.translate(field.after) : null'"
			+ "		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'"
			+ "		:years-dropdown='field.yearsDropdown'"
			+ "		:include-hours='field.includeHours'"
			+ "		:pattern-comment='$services.page.translate(field.regexLabel)'"
			+ "		:include-minutes='field.includeHours && field.includeMinutes'"
			+ "		:include-seconds='field.includeHours && field.includeMinutes && field.includeSeconds'"
			+ "		:years-from='parseInteger(field.yearsFrom)'"
			+ "		:years-to='parseInteger(field.yearsTo)'"
			+ "		:timestamp='field.isTimestamp'"
			+ "		:seconds-timestamp='field.isSecondsTimestamp'"
			+ "		:required='required'"
			+ "		:formatter='getFormatter()'"
			+ "		:parser='getParser()'"
			+ "		:translator='$services.page.translate'"
			+ "		:disabled='disabled'/>",
	props: {
		cell: {
			type: Object,
			required: true
		},
		page: {
			type: Object,
			required: true
		},
		field: {
			type: Object,
			required: true
		},
		value: {
			required: true
		},
		label: {
			type: String,
			required: false
		},
		timeout: {
			required: false
		},
		disabled: {
			type: Boolean,
			required: false
		},
		schema: {
			type: Object,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		placeholder: {
			type: String,
			required: false
		}
	},
	methods: {
		parseInteger: function(value) {
			var result = null;
			if (value != null) {
				result = this.$services.page.interpret(value);
			}	
			if (result != null) {
				return parseInt(result);
			}
		},
		getDefault: function() {
			if (this.field.bindings && this.field.bindings.default) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.default, this);
			}
		},
		getAllow: function () {
			if (this.field.allowFunction) {
				return this.$services.page.eval(this.field.allowFunction, {}, this, null, true);
			}
			if (this.field.bindings && this.field.bindings.allow) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.allow, this);
			}
		},
		getParser: function () {
			if (this.field.dateFormat) {
				var self = this;
				return function(date) {
					var parsed = null;
					if (date instanceof Date) {
						return date;
					}
					if (date) {
						// we split both the date value and the format on word boundaries
						var format = self.field.dateFormat.split(/\b/g);
						var parts = date.split(/\b/g);
						// if it is not correct, we just return null, we only return a date once we know what you typed
						if (format.length != parts.length) {
							return null;
						}
						var day = 1, month = 0, year = new Date().getFullYear(), hour = 0, minute = 0, second = 0, millisecond = 0;
						for (var i = 0; i < parts.length; i++) {
							// we are parsing the day
							if (format[i].match(/^[d]+$/)) {
								day = parseInt(parts[i]);
							}
							else if (format[i].match(/^[M]+$/)) {
								// is 0-based in javascript
								month = parseInt(parts[i]) - 1;
							}
							else if (format[i].match(/^[y]+$/)) {
								year = parseInt(parts[i]);
								if (format[i].length == 2) {
									year += new Date().getFullYear() - (new Date().getFullYear() % 100);
								}
							}
							else if (format[i].match(/^[H]+$/)) {
								hour = parseInt(parts[i]);
							}
							else if (format[i].match(/^[m]+$/)) {
								minute = parseInt(parts[i]);
							}
							else if (format[i].match(/^[s]+$/)) {
								second = parseInt(parts[i]);
							}
							else if (format[i].match(/^[S]+$/)) {
								millisecond = parseInt(parts[i]);
							}
						}
						return new Date(year, month, day, hour, minute, second, millisecond);
					}
					return parsed;
				}
			}
			else if (this.field.bindings && this.field.bindings.parser) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.parser, this);
			}
		},
		getFormatter: function () {
			if (this.field.dateFormat) {
				var self = this;
				return function(date) {
					return date ? self.$services.formatter.date(date, self.field.dateFormat) : null;
				}
			}
			else if (this.field.bindings && this.field.bindings.formatter) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.formatter, this);
			}
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});
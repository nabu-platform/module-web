Vue.component("page-form-input-text-configure", {
	template: "<div><h2 class='section-title'>Text field</h2><div class='is-column is-spacing-medium'><n-form-combo v-model='field.textType' label='Text Type' :items=\"['text', 'area', 'range', 'number', 'color', 'email', 'tel', 'password', 'url', 'time', 'date', 'datetime-local', 'month', 'week']\"/>"
		+ "	<n-form-switch v-model='field.trim' label='Trim value' />"
		+ "	<n-form-text v-model='field.regexLabel' label='Regex Label' :timeout='600'/>"
		+ "	<n-form-text v-model='field.regex' label='Regex' :timeout='600'/>"
		+ "	<n-form-text v-model='field.minLength' label='Min Length' :timeout='600'/>"
		+ "	<n-form-text v-model='field.maxLength' label='Max Length' :timeout='600'/>"
		+ "	<n-form-switch v-model='field.showLength' label='Show Length' v-if='field.maxLength'/>"
		+ "	<n-form-switch v-model='field.showCustomSpinner' label='Use custom spinners' v-if=\"field.textType == 'number'\"/>"
		+ "	<n-form-text v-model='field.info' label='Info Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before && false' :timeout='600'/>"
		+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after && false' :timeout='600'/>"
		+ "	<n-form-text v-model='field.prefix' label='Prefix' :timeout='600'/>"
		+ "	<n-form-text v-model='field.prefixIcon' label='Prefix Icon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffix' label='Suffix' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.minimum' label='Minimum' v-if=\"field.textType == 'range' || field.textType == 'number'\" :timeout='600'/>"
		+ "	<n-form-text v-model='field.maximum' label='Maximum' v-if=\"field.textType == 'range' || field.textType == 'number'\" :timeout='600'/>"
		+ "	<n-form-text v-model='field.step' label='Step' v-if=\"field.textType == 'range' || field.textType == 'number'\" :timeout='600'/>"
		+ "	<n-form-ace v-model='field.formatter' label='Formatter' :timeout='600' after='You can format the value that exists in the page for display (and edit) purposes for the user'/>"
		+ "	<n-form-ace v-model='field.parser' label='Parser' :timeout='600' after='You can parse the user-inputted value into something else to be stored in the page'/>"
		+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"validator\"]'/>"
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
		field: {
			type: Object,
			required: true
		}
	},
	created: function() {
		if (!this.field.textType) {
			Vue.set(this.field, "textType", null);
		}
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

Vue.component("page-form-input-text", {
	template: "<n-form-text :type='textType' ref='form'"
			+ "		:trim='field.trim'"
			+ "		:class=\"{'has-suffix-icon': !!field.suffixIcon, 'has-suffix': !!field.suffix }\""
			+ "		:edit='!readOnly'"
			+ "		:placeholder='$services.page.interpret($services.page.translate(placeholder), $self)'"
			+ "		:max-length='field.maxLength ? field.maxLength : null'"
			+ "		:min-length='field.minLength ? field.minLength : null'"
			+ "		:schema='schema'"
			+ "		:pattern-comment='field.regexLabel ? $services.page.translate(field.regexLabel) : null'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:pattern='field.regex'"
			+ "		v-bubble:blur"
			+ "		:required='required'"
			+ "		:validator='getValidator()'"
			+ "		:info='field.info ? $services.page.interpret($services.page.translate(field.info), $self) : null'"
			+ "		:before='field.before ? $services.page.interpret($services.page.translate(field.before), $self) : null'"
			+ "		:after='field.after ? $services.page.interpret($services.page.translate(field.after), $self) : null'"
			+ "		:prefix='field.prefix ? $services.page.translate(field.prefix) : field.prefix'"
			+ "		:suffix='field.suffix ? $services.page.translate(field.suffix) : field.suffix'"
			+ "		:prefix-icon='field.prefixIcon'"
			+ "		:suffix-icon='field.suffixIcon'"
			+ "		:minimum='field.minimum ? parseFloat($services.page.interpret(field.minimum, $self)) : null'"
			+ "		:maximum='field.maximum ? parseFloat($services.page.interpret(field.maximum, $self)) : null'"
			+ "		:step='field.step ? parseFloat($services.page.interpret(field.step, $self)) : null'"
			+ "		:name='field.name'"
			+ "		:timeout='timeout'"
			+ "		v-show='!hidden'"
			+ "		:show-custom-spinner='field.showCustomSpinner'"
			+ "		:formatter='getFormatter()'"
			+ "		:parser='getParser()'"
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
		placeholder: {
			type: String,
			required: false
		},
		required: {
			type: Boolean,
			required: false
		},
		codes: {
			required: false
		},
		hidden: {
			type: Boolean,
			required: false,
			default: false
		}
	},
	computed: {
		allCodes: function() {
			var codes = [];
			if (this.field.codes) {
				nabu.utils.arrays.merge(codes, this.field.codes);
			}
			if (this.codes) {
				nabu.utils.arrays.merge(codes, this.codes);
			}
			var result = {};
			var self = this;
			codes.forEach(function(code) {
				result[code.code] = self.$services.page.translate(code.title);
			});
			return result;
		},
		textType: function() {
			return this.field.textType ? this.field.textType : 'text';
		}
	},
	methods: {
		getFormatter: function() {
			if (!this.field.formatter) {
				return null;
			}	
			var self = this;
			return function(value) {
				return self.$services.page.eval(self.field.formatter, value, self);
			};
		},
		getParser: function() {
			if (!this.field.parser) {
				return null;
			}	
			var self = this;
			return function(value) {
				return self.$services.page.eval(self.field.parser, value, self);
			};
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		getValidator: function() {
			if (this.field.bindings && this.field.bindings.validator) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.validator, this);
			}
		}
	}
});


Vue.component("page-form-input-hidden", {
	template: "<page-form-input-text :cell='cell' :page='page' :field='field' :value='value' :label='label' :timeout='timeout' "
		+ ":disabled='disabled' :schema='schema' :read-only='readOnly' :placeholder='placeholder' :codes='codes' :hidden='true'/>",
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
		placeholder: {
			type: String,
			required: false
		},
		codes: {
			required: false
		}
	}
});

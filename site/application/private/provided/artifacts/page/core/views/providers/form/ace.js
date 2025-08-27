Vue.component("page-form-input-ace-configure", {
	template: "<n-form-section><n-form-combo v-model='field.textType' label='Text Type' :items=\"['text', 'area', 'range', 'number', 'color', 'email', 'password']\"/>"
		+ "	<n-form-text v-model='field.info' label='Info Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before && false' :timeout='600'/>"
		+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after && false' :timeout='600'/>"
		+ "	<n-form-text v-model='field.prefix' label='Prefix' :timeout='600'/>"
		+ "	<n-form-text v-model='field.prefixIcon' label='Prefix Icon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffix' label='Suffix' :timeout='600'/>"
		+ "	<n-form-text v-model='field.suffixIcon' label='Suffix Icon' :timeout='600'/>"
		+ "	<n-form-text v-model='field.mode' label='Mode' :timeout='600'/>"
		+ "</n-form-section>",
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

Vue.component("page-form-input-ace", {
	template: "<n-form-ace :mode='field.mode' ref='form'"
			+ "		:class=\"{'has-suffix-icon': !!field.suffixIcon, 'has-suffix': !!field.suffix }\""
			+ "		:edit='!readOnly'"
			+ "		:placeholder='$services.page.interpret($services.page.translate(placeholder), $self)'"
			+ "		:schema='schema'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		v-bubble:blur"
			+ "		:required='required'"
			+ "		:info='field.info ? $services.page.interpret($services.page.translate(field.info), $self) : null'"
			+ "		:before='field.before ? $services.page.interpret($services.page.translate(field.before), $self) : null'"
			+ "		:after='field.after ? $services.page.interpret($services.page.translate(field.after), $self) : null'"
			+ "		:prefix='field.prefix ? $services.page.translate(field.prefix) : field.prefix'"
			+ "		:suffix='field.suffix ? $services.page.translate(field.suffix) : field.suffix'"
			+ "		:prefix-icon='field.prefixIcon'"
			+ "		:suffix-icon='field.suffixIcon'"
			+ "		:name='field.name'"
			+ "		:timeout='timeout'"
			+ "		v-show='!hidden'"
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
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});


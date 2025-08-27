Vue.component("page-form-input-switch-configure", {
	template: "<div>"
		+ "	<n-form-switch v-model='field.invert' label='Invert Boolean'/>"
		+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before && false' :timeout='600'/>"
		+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
		+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after && false' :timeout='600'/>"
		+ "</div>",
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
	}
});

Vue.component("page-form-input-switch", {
	template: "<n-form-switch ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:required='required'"
			+ "		:schema='schema'"
			+ "		:class=\"getChildComponentClasses('page-form-switch')\""
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:value='value'"
			+ "		:before='field.before ? $services.page.interpret($services.page.translate(field.before), $self) : null'"
			+ "		:after='field.after ? $services.page.interpret($services.page.translate(field.after), $self) : null'"
			+ "		:timeout='timeout'"
			+ "		:invert='!!field.invert'"
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
		required: {
			type: Boolean,
			required: false
		},
		readOnly: {
			type: Boolean,
			required: false
		},
		childComponents: {
			required: false
		}
	},
	methods: {
		getChildComponents: function() {
			return {
				title: "Form Switch",
				name: "page-form-switch",
				component: "form-switch"
			};
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		}
	}
});
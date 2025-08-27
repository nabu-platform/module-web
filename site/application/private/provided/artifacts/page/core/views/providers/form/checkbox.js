Vue.component("page-form-input-checkbox-configure", {
	template: "<div><n-form-switch v-model='field.mustCheck' label='Must Check'/>"
			+ "	<n-form-text v-model='field.info' label='Info Content'/>" 
			+ "	<n-form-switch v-model='field.invert' label='Invert Boolean'/>" 
			+ "	<n-form-text v-model='field.infoIcon' label='Info Icon'/>"
			+ "	<n-form-text v-model='field.before' label='Before Content' :timeout='600'/>"
			+ "	<n-form-text v-model='field.beforeIcon' label='Before Icon' v-if='field.before && false' :timeout='600'/>"
			+ "	<n-form-text v-model='field.after' label='After Content' :timeout='600'/>"
			+ "	<n-form-text v-model='field.afterIcon' label='After Icon' v-if='field.after && false' :timeout='600'/>"
			+ "	<n-page-mapper v-model='field.bindings' :from='availableParameters' :to='[\"item\"]'/>"
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
	},
	created: function() {
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

Vue.component("page-form-input-checkbox", {
	template: "<n-form-checkbox ref='form'"
			+ "		:edit='!readOnly'"
			+ "		:schema='schema'"
			+ "		:class=\"getChildComponentClasses('page-form-checkbox')\""
			+ "		:info-icon='field.infoIcon'"
			+ "		:info='field.info ? $services.page.interpret($services.page.translate(field.info), $self) : null'"
			+ "		:required='required'"
			+ "		:must-check='field.mustCheck'"
			+ "		@input=\"function(newValue) { $emit('input', newValue) }\""
			+ "		:label='label'"
			+ "		:item='getItem()'"
			+ "		:value='value'"
			+ "		:timeout='timeout'"
			+ "		:before='field.before ? $services.page.interpret($services.page.translate(field.before), $self) : null'"
			+ "		:after='field.after ? $services.page.interpret($services.page.translate(field.after), $self) : null'"
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
				title: "Form Checkbox",
				name: "page-form-checkbox",
				component: "form-checkbox"
			};
		},
		validate: function(soft) {
			return this.$refs.form.validate(soft);
		},
		getItem: function() {
			if (this.field.bindings && this.field.bindings.item) {
				var pageInstance = this.$services.page.getPageInstance(this.page, this);
				return this.$services.page.getBindingValue(pageInstance, this.field.bindings.item, this);
			}
		}
	}
});
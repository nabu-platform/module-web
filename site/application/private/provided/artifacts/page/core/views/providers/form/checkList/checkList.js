Vue.component("page-form-checkbox-list-configure", {
	template: "#page-form-checkbox-list-configure",
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


Vue.component("page-form-checkbox-list", {
	mixins: [Vue.component("enumeration-provider")],
	template: "#page-form-checkbox-list",
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
		parentValue: {
			type: Object,
			required: false
		},
		childComponents: {
			required: false
		}
	},
	// if we have an operation binding, let's retrigger the data lookup (for checkbox-list 2)
	watch: {
		operationBinding: {deep: true, handler: function(newValue) {
			// set to dirty
			// the first checkbox-list is the form-checkbox-list which in turn has its own ref
			if (this.$refs.checkbox-list && this.$refs.checkbox-list.$refs.checkbox-list) {
				this.$refs.checkbox-list.$refs.checkbox-list.markDirty();
			}
		}}
	},
	methods: {
		configurator: function() {
			return "page-form-checkbox-list-configure";
		},
		getChildComponents: function() {
			return {
				title: "Form checkbox-list",
				name: "page-form-checkbox-list",
				component: "form-checkbox-list"
			};
		},
		validate: function(soft) {
			if (this.$refs["checkbox-list"]) {
				return this.$refs["checkbox-list"].validate(soft);
			}
		}
	}
})


window.addEventListener("load", function() {
	application.bootstrap(function($services) {
		$services.router.register({
			alias: "page-form-checkbox-list",
			enter: function(parameters) {
				// do not modify parameters directly, this may lead to rerendering issues
				var cloneParameters = {};
				nabu.utils.objects.merge(cloneParameters, parameters);
				cloneParameters.formComponent = "page-form-checkbox-list";
				cloneParameters.configurationComponent = "page-form-checkbox-list-configure";
				cloneParameters.subTabs = ["data"];
				return new nabu.page.views.FormComponent({propsData: cloneParameters});
			},
			form: "checkbox-list",
			category: "Form",
			name: "checkbox-list",
			description: "A checkbox-list that allows the user to choose one or more values",
			icon: "page/core/images/enumeration.png"
		});
	})
});

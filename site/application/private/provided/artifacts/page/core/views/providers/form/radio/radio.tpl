<template id="page-form-radio-configure">
	<div class="page-form-radio-configure">
		<template v-if="$services.page.activeSubTab == 'component'">
			<h2 class="section-title">Radio box</h2>
			<div class="is-column is-spacing-medium">
				<n-form-ace v-model="field.disableEntryCondition" label="Disable entry condition"/>
			</div>
		</template>
		<template v-else-if="$services.page.activeSubTab == 'data'">
			<enumeration-provider-configure :field="field" :page="page" :cell="cell"/>		
		</template>
	</div>
</template>

<template id="page-form-radio">
	<n-form-radio
		ref="radio"
		:load-on-focus="field.loadOnFocus"
		:class="getChildComponentClasses('page-form-radio')"
		:filter='enumerationFilter'
		:formatter="enumerationFormatter"
		:extracter="enumerationExtracter"
		:disabler="disabler"
		:edit='!readOnly'
		@input="function(newValue, label, rawValue, selectedLabel) { $emit('input', newValue, label, rawValue, selectedLabel) }"
		v-bubble:label
		:timeout='600'
		v-bubble:blur
		:label='label'
		:value='value'
		:nillable="!required"
		:required="required"
		:info='field.info ? $services.page.translate(field.info) : null'
		:before='field.before ? $services.page.translate(field.before) : null'
		:after='field.after ? $services.page.translate(field.after) : null'
		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'
		:schema='schema'
		:disabled='disabled'
		/>
</template>
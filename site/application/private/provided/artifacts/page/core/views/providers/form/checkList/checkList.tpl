<template id="page-form-checkbox-list-configure">
	<div class="page-form-checkbox-list-configure">
		<template v-if="$services.page.activeSubTab == 'component'">
			<h2 class="section-title">Checkbox list</h2>
			<div class="is-column is-spacing-medium">
				
			</div>
		</template>
		<template v-else-if="$services.page.activeSubTab == 'data'">
			<enumeration-provider-configure :field="field" :page="page" :cell="cell"/>		
		</template>
	</div>
</template>

<template id="page-form-checkbox-list">
	<n-form-checkbox-list
		ref="checkbox-list"
		:load-on-focus="field.loadOnFocus"
		:class="getChildComponentClasses('page-form-checkbox-list')"
		:filter='enumerationFilter'
		:formatter="enumerationFormatter"
		:extracter="enumerationExtracter"
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
		:schema='schema'
		:disabled='disabled'
		/>
</template>
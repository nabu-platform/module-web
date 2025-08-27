<template id="page-form-combo-configure">
	<div class="page-form-combo-configure">
		<template v-if="$services.page.activeSubTab == 'component'">
			<h2 class="section-title">Combo box</h2>
			<div class="is-column is-spacing-medium">
				<n-form-text v-model="field.placeholderSelected" label="Placeholder with items selected" info="Use {amount} as variable if you want"/>
				<n-form-switch v-model='field.useCheckbox' label='Add checkboxes' info="Each entry will have a checkbox as will the select all and reset value"/>
				<n-form-switch v-model='field.showTags' label='Show selected tags' info="Visualize the currently selected items with tags"/>
				<n-form-text v-if="field.showTags" v-model='field.maxAmountOfTags' label='Max amount of tags visible' placeholder='3' info='Choose how many tags should maximum be visible at any given time, set to 0 to show all tags'/>
				<n-form-switch v-model='field.showAmount' label='Show selected amount' info="Show a counter of how many items are selected"/>
				<n-form-switch :invert='true' v-model='field.allowTyping' label='Disable typing' info='Can the user type to search?'/>
				<n-form-switch v-model='field.selectFirstIfEmpty' label='Select the first value if none has been selected yet'/>
				<n-form-switch v-model='field.loadOnFocus' label='Reload on focus'/>
				<n-form-switch v-model="field.searchInDropdown" label="Show search in dropdown" info="This will also use the rich formatter (if possible) for displaying the current item"/>
			</div>
		</template>
		<template v-else-if="$services.page.activeSubTab == 'data'">
			<enumeration-provider-configure :field="field" :page="page" :cell="cell"/>		
		</template>
	</div>
</template>

<template id="page-form-combo">
	<n-form-combo combo-type="n-input-combo2"
		ref="combo"
		:load-on-focus="field.loadOnFocus"
		:class="getChildComponentClasses('page-form-combo')"
		:filter="enumerationFilter"
		:resolver="enumerationResolver"
		:formatter="enumerationFormatter"
		:pretty-formatter="enumerationPrettyFormatter"
		:extracter="enumerationExtracter"
		:search-in-dropdown="field.searchInDropdown"
		:edit='!readOnly'
		:placeholder='placeholder'
		:placeholder-selected='field.placeholderSelected'
		@input="function(newValue, label, rawValue, selectedLabel) { $emit('input', newValue, label, rawValue, selectedLabel) }"
		v-bubble:label
		:timeout='600'
		v-bubble:blur
		:label='label'
		:value='value'
		:nillable="!required"
		:required="required"
		:allow-typing='field.allowTyping'
		:empty-value='field.emptyValue ? $services.page.translate($services.page.interpret(field.emptyValue)) : null'
		:calculating-value='field.calculatingValue ? $services.page.translate($services.page.interpret(field.calculatingValue)) : null'
		:reset-value='field.resetValue ? $services.page.translate($services.page.interpret(field.resetValue)) : null'
		:info='field.info ? $services.page.translate(field.info) : null'
		:before='field.before ? $services.page.translate(field.before) : null'
		:after='field.after ? $services.page.translate(field.after) : null'
		:suffix='field.suffixIcon ? $services.page.getIconHtml(field.suffixIcon) : field.suffix'
		:schema='schema'
		:disabled='disabled'
		:select-all-value='field.selectAllValue ? $services.page.translate($services.page.interpret(field.selectAllValue)) : null'
		:use-checkbox='field.useCheckbox'
		:show-tags='field.showTags'
		:show-amount='field.showAmount'
		:max-amount-of-tags='field.maxAmountOfTags'
		/>
</template>
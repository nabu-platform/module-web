<template id="enumeration-provider-configure">
	<div class="enumeration-provider-configure is-column">
		<h2 class="section-title">Data Source</h2>
		<div class="is-column is-spacing-medium">
			<n-form-combo v-model="field.provider" :items="['operation', 'array', 'provider', 'fixed']" label="Data source" />
		</div>
		<template v-if="field.provider == 'operation'">
			<h2 class="section-title">Operation</h2>
			<div class="is-column is-spacing-medium">
				<n-form-combo v-model='field.enumerationOperation'
					label='Enumeration Operation'
					:filter='getEnumerationServices'/>
			
				<n-page-mapper v-if='field.enumerationOperation && hasMappableEnumerationParameters(field)'
					v-model='field.enumerationOperationBinding'
					:from='availableParameters'
					:to='getMappableEnumerationParameters(field)'/>
					
				<n-form-combo v-if='field.enumerationOperation' 
					:filter='function() { return getEnumerationFields(field.enumerationOperation) }' 
					v-model='field.enumerationCachingKey' 
					label='Enumeration Caching Key'/>
			</div>
		</template>
		<template v-if="field.provider == 'operation'">
			<h2 class="section-title">Fields</h2>	
			<div class="is-column is-spacing-medium">
				<n-form-switch v-model='field.enumerationFieldLabelComplex' label='Complex Enumeration Label'/>
				
				<n-form-switch v-model='field.enumerationFieldPrettyLabelComplex' label='Complex Pretty Enumeration Label'/>
				<n-form-combo v-if='field.enumerationArray && !field.enumerationFieldPrettyLabelComplex' v-model='field.enumerationFieldPrettyLabel' label='Pretty enumeration Label'
					:filter='function(value) { return getEnumerationFields(field.enumerationArray, value) }'/>
				<n-form-ace v-model='field.complexPrettyLabel' label='The complex pretty label' v-if='field.enumerationFieldPrettyLabelComplex'/>				
				
				<n-form-combo 
					v-if='field.enumerationOperation && !field.enumerationFieldLabelComplex' 
					label='Enumeration Label'
					v-model='field.enumerationFieldLabel' 
					:filter='function(value) { return getEnumerationFields(field.enumerationOperation, value) }'/>
				
				<n-form-combo 
					v-if='field.enumerationOperation' 
					label='Enumeration Value'
					v-model='field.enumerationFieldValue' 
					:filter='function(value) { return getEnumerationFields(field.enumerationOperation, value) }' 
					info='If nothing is selected, the entire document becomes the value'/>
					
				<n-form-combo 
					v-if='field.enumerationOperation' 
					label='Enumeration Query'
					v-model='field.enumerationOperationQuery' 
					:filter='function(value) { return getEnumerationParameters(field.enumerationOperation, value) }'/>
					
				<n-form-combo 
					v-if='field.enumerationOperation && field.enumerationFieldValue' 
					label='Resolve Field'
					v-model='field.enumerationOperationResolve' 
					:filter='function(value) { return getEnumerationParameters(field.enumerationOperation, value) }' />
					
				<n-form-ace mode="html" v-model='field.complexLabel' label='The complex text label' v-if='field.enumerationOperation && field.enumerationFieldLabelComplex'/>
				<typography-variable-replacer v-if='field.enumerationOperation && field.enumerationFieldLabelComplex && field.complexLabel' :content='field.complexLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationOperation)' />
			</div>
		</template>
		<template v-if="field.provider == 'operation'">	
			<h2 class="section-title">Copywriting</h2>	
			<div class="is-column is-spacing-medium">
				<n-form-text v-model='field.emptyValue' label='Empty Value Text'/>
				<n-form-text v-model='field.calculatingValue' label='Calculating Value Text' info='The text to show while the result is being calculated'/>
				<n-form-text v-model='field.resetValue' label='Reset Value Text' info='The text to show to reset the current value'/>
				<n-form-text v-model='field.selectAllValue' label='Select all value' info='The text to show to select all values or deselect all'/>
			</div>
		</template>
		<template v-if="field.provider == 'array'">
			<n-form-combo v-model='field.enumerationArray'
				label='Enumeration Array'
				:filter='getEnumerationArrays'/>
			<n-form-ace v-if='field.enumerationArray' label='Filter' v-model='field.filter'/>
			<n-form-switch v-model='field.enumerationFieldLabelComplex' label='Complex Enumeration Label'/>
			<n-form-combo v-if='field.enumerationArray && !field.enumerationFieldLabelComplex' v-model='field.enumerationFieldLabel' label='Enumeration Label'
				:filter='function(value) { return getEnumerationFields(field.enumerationArray, value) }'/>
			<n-form-switch v-model='field.enumerationFieldPrettyLabelComplex' label='Complex Pretty Enumeration Label'/>
			<n-form-combo v-if='field.enumerationArray && !field.enumerationFieldPrettyLabelComplex' v-model='field.enumerationFieldPrettyLabel' label='Pretty enumeration Label'
				:filter='function(value) { return getEnumerationFields(field.enumerationArray, value) }'/>
			<n-form-ace v-model='field.complexPrettyLabel' label='The complex pretty label' v-if='field.enumerationFieldPrettyLabelComplex'/>
			<n-form-combo v-if='field.enumerationArray' v-model='field.enumerationFieldValue' label='Enumeration Value'
				:filter='function(value) { return getEnumerationFields(field.enumerationArray, value) }' info='If nothing is selected, the entire document becomes the value'/>
			<n-form-ace mode="html" v-model='field.complexLabel' label='The complex text label' v-if='field.enumerationFieldLabelComplex'/>
			<typography-variable-replacer v-if='field.enumerationFieldLabelComplex && field.complexLabel' :content='field.complexLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationArray)' />
			<typography-variable-replacer v-if='field.enumerationFieldPrettyLabelComplex && field.complexPrettyLabel' :content='field.complexPrettyLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationArray)' />
			<n-form-combo v-if='field.enumerationArray' :filter='function() { return getEnumerationFields(field.enumerationArray) }' v-model='field.enumerationCachingKey' label='Enumeration Caching Key'/>
		</template>
		<div class="is-column is-spacing-medium" v-if="field.provider == 'fixed'">	
			<n-form-switch v-model='field.complex' label='Complex Values' v-if='!field.allowCustom'/>
			<n-form-switch v-if='!field.complex' v-model='field.allowCustom' label='Allow Custom Values'/>
			<div class='is-row is-align-end'>
				<button class='is-button is-size-xsmall is-variant-primary-outline' @click='addEnumeration'><icon name='plus'/><span class='text'>Enumeration</span></button>
			</div>
			<div v-if='!field.complex' class='is-column is-spacing-gap-small'>
				<n-form-section class='has-button-close' v-for='i in Object.keys(field.enumerations)' :key="field.name + 'enumeration_' + i">
					<n-form-text v-model='field.enumerations[i]'/>
					<button class='is-button is-variant-close is-size-small' @click='field.enumerations.splice(i, 1)'><icon name='times'/></button>
				</n-form-section>
			</div>
			<div v-else class='is-column is-spacing-gap-small'>
				<n-form-section class='is-column is-spacing-medium is-spacing-vertical-top-large is-color-body has-button-close' v-for='i in Object.keys(field.enumerations)' :key="field.name + 'enumeration_' + i">
					<n-form-text v-model='field.enumerations[i].key' placeholder='Value' :timeout='600'/>
					<n-form-text v-model='field.enumerations[i].value' placeholder='Label' :timeout='600'/>
					<button class='is-button is-variant-close is-size-small' @click='field.enumerations.splice(i, 1)'><icon name='times'/></button>
				</n-form-section>
			</div>
		</div>
		<div class="is-column is-spacing-medium" v-if="field.provider == 'provider'">
			<n-form-combo v-model='field.enumerationProvider' :filter='getEnumerationProviders' label='Enumeration Provider'/>
			<n-form-combo v-if='providerValueOptions' :items='providerValueOptions' v-model='field.enumerationFieldValue' label='Value Field'/>
			<n-form-combo v-if='providerLabelOptions && !field.enumerationFieldLabelComplex' :items='providerLabelOptions' v-model='field.enumerationFieldLabel' label='Label Field'/>
			<n-form-switch v-model='field.enumerationFieldLabelComplex' label='Complex Enumeration Label'/>
			<n-form-ace v-if='field.enumerationArray' label='Filter' v-model='field.filter'/>
			<n-form-ace mode="html" v-model='field.complexLabel' label='The complex text label' v-if='field.enumerationProvider && field.enumerationFieldLabelComplex'/>
			<typography-variable-replacer v-if='field.enumerationProvider && field.enumerationFieldLabelComplex && field.complexLabel' :content='field.complexLabel' :page='page' :container='field' :keys='getEnumerationFields(field.enumerationProvider)' />
		</div>
	</div>
</template>


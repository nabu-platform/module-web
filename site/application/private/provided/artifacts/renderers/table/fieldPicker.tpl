<template id="data-field-picker">
	<n-form class="data-field-picker is-column is-color-background is-spacing-large is-overflow-auto is-variant-vertical">
		<h1>Table settings</h1>
		<n-form-text v-model="value.repeatName" label="Name of the repeat"/>
		<n-form-checkbox v-if="!allChecked" label="Check all" :value="false" @input="checkAll"/>
		<n-form-checkbox v-else label="Uncheck all" :value="true" @input="uncheckAll"/>
		<div v-for="field in result" class="is-row">
			<n-form-checkbox v-model="field.checked" :label="field.name" class="is-column is-fill-normal"/>
			<button class="is-button is-size-small is-primary-outline" @click="upAll(field)"><icon name="chevron-circle-up"/></button>
			<button class="is-button is-size-small is-primary-outline" @click="up(field)"><icon name="chevron-up"/></button>
			<button class="is-button is-size-small is-primary-outline" @click="down(field)"><icon name="chevron-down"/></button>
			<button class="is-button is-size-small is-primary-outline" @click="downAll(field)"><icon name="chevron-circle-down"/></button>
		</div>
		<div class="is-row is-spacing-vertical-medium">
			<button class="is-button is-variant-link" @click="$reject()">Cancel</button>
			<button class="is-button is-variant-primary is-position-right" @click="$resolve()">Generate</button>
		</div>
	</n-form>
</template>
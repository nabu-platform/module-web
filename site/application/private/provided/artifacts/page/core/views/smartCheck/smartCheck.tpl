<template id="page-smart-check">
	<component :is="component" :value="checked" @input="toggle" :label="cell.state.label ? $services.page.interpret($services.page.translate(cell.state.label), $self) : null"
		:disabled="running || disabled"/>
</template>

<template id="page-smart-check-configure">
	<div class="is-column">
		<div class="is-column is-spacing-medium">
			<n-form-text v-model="cell.state.label" label="Label" :timeout="600"/>
			<n-form-combo v-model="cell.state.component" label="Component"
				:items="[{name: 'n-form-checkbox', title: 'Checkbox'},{name:'n-form-switch', title: 'Switch'}]"
				:formatter="function(x) { return x.title }"
				:extracter="function(x) { return x.name }"/>
			<n-form-ace v-model="cell.state.checkCondition" label="Checked when"/>
			<n-form-ace v-model="cell.state.disabledCondition" label="Disabled when"/>
		</div>
		<page-triggerable-configure :page="page" :target="cell.state" :triggers="{'check': {}, 'clear': {}}" :allow-closing="true"/>
	</div>
</template>
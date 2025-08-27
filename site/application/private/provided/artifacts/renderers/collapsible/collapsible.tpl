<template id="page-collapsible">
	<div class="is-collapsible" :class="[getChildComponentClasses('collapsible'), {'is-open': show || edit, 'is-closed': !show && !edit}]">
		<typography-h3 :page="page" :cell="target" :parameters="parameters" :edit="edit" :child-components="childComponents" @click.native="toggle" class="is-title">
			<icon slot="after" :name="show || edit ? iconOpen : iconClosed"></icon>
		</typography-h3>
		<div class="is-collapsible-content" :class="contentClass" v-if="show || edit" @click.native="checkPrevent">
			<slot></slot>
		</div>
	</div>
</template>

<template id="page-collapsible-configure">
	<div>
		<n-form-text v-model="target.collapsible.iconClosed" label="Icon closed" placeholder="chevron-down"/>
		<n-form-text v-model="target.collapsible.iconOpen" label="Icon open" placeholder="chevron-up"/>
		<n-form-switch v-model="target.collapsible.startOpen" label="Start open"/>
		<n-form-switch v-model="target.collapsible.closeSiblings" label="Close siblings"/>
		<n-form-switch v-model="target.collapsible.stopPropagation" label="Stop click propagation"/>
	</div>
</template>
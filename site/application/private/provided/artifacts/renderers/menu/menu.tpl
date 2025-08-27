<template id="renderer-menu">
	<ul class="is-menu" :class="[{'is-editing': edit, 'is-expanded': edit || !state.collapsed, 'is-collapsed': !edit && state.collapsed}, getChildComponentClasses('renderer-menu')]" @click="handle" @mouseover="expand" @mouseout="collapse" v-auto-close.menu="autoclose">
		<slot v-if="edit || state.collapsed" name="collapsed"></slot>
		<slot></slot>
		<slot v-if="edit || !state.collapsed" name="expanded"></slot>
	</ul>
</template>

<template id="renderer-menu-configure">
	<div class="is-column is-spacing-gap-medium">
		<n-form-switch v-model="target.state.collapsible" label="Is collapsible"/>
		<n-form-switch v-if="target.state.collapsible" v-model="target.state.expandOnHover" label="Open on hover"/>
		<n-form-ace v-if="target.state.collapsible" v-model="target.state.initialCollapsed" label="Initial collapsed value"/>
		<page-event-value :page="page" :container="target.state" title="Handled Event" name="handledEvent" @resetEvents="resetEvents" :inline="true"/>
	</div>
</template>
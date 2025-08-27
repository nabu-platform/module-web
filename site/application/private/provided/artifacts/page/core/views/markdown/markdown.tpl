<template id="page-markdown-text">
	<template v-if="edit">
		<textarea style="min-height:100%" :rows="rowHeight" v-model="cell.state.content"></textarea>
	</template>
	<template v-else>
		<article class="is-article" v-content="formatted"/>
	</template>
</template>